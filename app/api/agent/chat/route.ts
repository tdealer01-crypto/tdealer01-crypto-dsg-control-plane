// DadBot streaming chat endpoint — proxies to Anthropic Claude with DSG command tools
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `คุณคือ DadBot (แดดบอท) ผู้ช่วย AI ของ DSG Agent บน Android ของเจ้าของ
คุณช่วยเจ้าของควบคุมเครื่อง Android ผ่านคำสั่งภาษาธรรมชาติ ทั้งภาษาไทยและอังกฤษ

คำสั่งที่คุณสั่งบนเครื่องได้:
- OPEN_URL: เปิด URL (target = URL เต็ม เช่น https://youtube.com)
- OPEN_APP: เปิดแอป (target = package name เช่น com.android.settings)
- OPEN_SETTINGS: เปิด Android Settings
- BACK: กดปุ่ม Back
- HOME: กดปุ่ม Home
- SCROLL_DOWN: เลื่อนหน้าจอลง
- STATUS: ดูสถานะระบบ
- FILE_LIST_ROOT: แสดงรายการไฟล์ใน storage
- FILE_PREVIEW: ดูเนื้อหาไฟล์ (target = file path)
- FILE_RENAME: เปลี่ยนชื่อ (target = "path||newName")
- FILE_MOVE: ย้ายไฟล์ (target = "path||destDir")
- FILE_DELETE: ลบไฟล์ (target = file path)

กฎ:
- ตอบสั้น กระชับ ใช้ภาษาเดียวกับผู้ใช้
- เมื่อผู้ใช้สั่งให้ทำอะไรบนเครื่อง ให้ใช้ tool queue_command ทันที ไม่ต้องถามซ้ำ
- แจ้งผู้ใช้สั้น ๆ ว่ากำลังทำอะไร แล้วค่อย call tool`;

const DSG_TOOLS = [
  {
    name: 'queue_command',
    description: "Queue a command for immediate execution on the owner's Android device",
    input_schema: {
      type: 'object' as const,
      properties: {
        command_type: {
          type: 'string',
          enum: [
            'OPEN_URL', 'OPEN_APP', 'OPEN_SETTINGS', 'BACK', 'HOME', 'SCROLL_DOWN',
            'STATUS', 'FILE_LIST_ROOT', 'FILE_PREVIEW', 'FILE_RENAME', 'FILE_MOVE', 'FILE_DELETE',
          ],
        },
        target: { type: 'string', description: 'Target for the command (URL, package, path, etc.)' },
        reason: { type: 'string', description: 'Short human-readable reason' },
      },
      required: ['command_type', 'target', 'reason'],
    },
  },
];

export async function GET() {
  return Response.json({
    ok: true,
    endpoint: 'POST /api/agent/chat',
    body: '{ messages: [{role: "user"|"assistant", content: string}] }',
    stream: 'text/event-stream — {"type":"text","delta":"..."} | {"type":"command",...} | {"type":"done"} | {"type":"error",...}',
    model: 'claude-haiku-4-5-20251001',
  });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return sseError('ANTHROPIC_API_KEY not configured on server');
  }

  let messages: { role: string; content: string }[] = [];
  try {
    const body = await request.json();
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    return sseError('Invalid JSON body');
  }

  if (messages.length === 0) return sseError('messages array is empty');

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        stream: true,
        system: SYSTEM_PROMPT,
        tools: DSG_TOOLS,
        messages,
      }),
    });
  } catch (e) {
    return sseError(`Failed to reach Anthropic API: ${e instanceof Error ? e.message : e}`);
  }

  if (!anthropicRes.ok || !anthropicRes.body) {
    const errText = await anthropicRes.text().catch(() => '');
    return sseError(`Anthropic ${anthropicRes.status}: ${errText.slice(0, 200)}`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const emit = (obj: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

      const reader = anthropicRes.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let toolBuf: { name: string; input: string } | null = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === '[DONE]') continue;
            let ev: Record<string, unknown>;
            try { ev = JSON.parse(raw); } catch { continue; }

            const t = ev.type as string;
            if (t === 'content_block_start') {
              const block = ev.content_block as Record<string, unknown> | undefined;
              if (block?.type === 'tool_use') {
                toolBuf = { name: block.name as string, input: '' };
              }
            } else if (t === 'content_block_delta') {
              const delta = ev.delta as Record<string, unknown> | undefined;
              if (delta?.type === 'text_delta') {
                emit({ type: 'text', delta: delta.text });
              } else if (delta?.type === 'input_json_delta' && toolBuf) {
                toolBuf.input += delta.partial_json as string;
              }
            } else if (t === 'content_block_stop' && toolBuf) {
              let args: Record<string, unknown> = {};
              try { args = JSON.parse(toolBuf.input || '{}'); } catch { /* skip */ }
              emit({
                type: 'command',
                commandType: args.command_type ?? 'STATUS',
                target: args.target ?? '',
                reason: args.reason ?? toolBuf.name,
              });
              toolBuf = null;
            } else if (t === 'message_stop') {
              emit({ type: 'done' });
            }
          }
        }
        emit({ type: 'done' });
      } catch (e) {
        emit({ type: 'error', message: e instanceof Error ? e.message : 'Stream read error' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function sseError(message: string): Response {
  const body = `data: ${JSON.stringify({ type: 'error', message })}\n\ndata: {"type":"done"}\n\n`;
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
