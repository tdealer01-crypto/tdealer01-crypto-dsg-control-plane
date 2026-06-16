// DadBot streaming chat endpoint — DSG command tools.
// Provider: OpenRouter (free models, e.g. Nemotron) when OPENROUTER_API_KEY is
// set, otherwise Anthropic Claude. Model is overridable via DSG_DADBOT_MODEL.
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

const COMMAND_ENUM = [
  'OPEN_URL', 'OPEN_APP', 'OPEN_SETTINGS', 'BACK', 'HOME', 'SCROLL_DOWN',
  'STATUS', 'FILE_LIST_ROOT', 'FILE_PREVIEW', 'FILE_RENAME', 'FILE_MOVE', 'FILE_DELETE',
];

const TOOL_PARAMETERS = {
  type: 'object' as const,
  properties: {
    command_type: { type: 'string', enum: COMMAND_ENUM },
    target: { type: 'string', description: 'Target for the command (URL, package, path, etc.)' },
    reason: { type: 'string', description: 'Short human-readable reason' },
  },
  required: ['command_type', 'target', 'reason'],
};

const TOOL_DESCRIPTION = "Queue a command for immediate execution on the owner's Android device";

// Anthropic tool shape
const DSG_TOOLS = [
  { name: 'queue_command', description: TOOL_DESCRIPTION, input_schema: TOOL_PARAMETERS },
];

// OpenAI / OpenRouter tool shape
const OPENAI_TOOLS = [
  { type: 'function', function: { name: 'queue_command', description: TOOL_DESCRIPTION, parameters: TOOL_PARAMETERS } },
];

const DEFAULT_OPENROUTER_MODEL = 'qwen/qwen-2.5-7b-instruct:free';
const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

function activeProvider(): { provider: 'openrouter' | 'anthropic'; model: string } | null {
  if (process.env.OPENROUTER_API_KEY) {
    return {
      provider: 'openrouter',
      model: process.env.DSG_DADBOT_MODEL || process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
    };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: 'anthropic', model: process.env.DSG_DADBOT_MODEL || DEFAULT_ANTHROPIC_MODEL };
  }
  return null;
}

export async function GET() {
  const active = activeProvider();
  return Response.json({
    ok: true,
    endpoint: 'POST /api/agent/chat',
    body: '{ messages: [{role: "user"|"assistant", content: string}] }',
    stream: 'text/event-stream — {"type":"text","delta":"..."} | {"type":"command",...} | {"type":"done"} | {"type":"error",...}',
    provider: active?.provider ?? 'none',
    model: active?.model ?? null,
    note: 'Set OPENROUTER_API_KEY for free models (default qwen-2.5-7b:free) or ANTHROPIC_API_KEY. Override the model with DSG_DADBOT_MODEL.',
  });
}

export async function POST(request: NextRequest) {
  const active = activeProvider();
  if (!active) {
    return sseError('No LLM provider configured. Set OPENROUTER_API_KEY (free models) or ANTHROPIC_API_KEY on the server.');
  }

  let messages: { role: string; content: string }[] = [];
  try {
    const body = await request.json();
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    return sseError('Invalid JSON body');
  }
  if (messages.length === 0) return sseError('messages array is empty');

  return active.provider === 'openrouter'
    ? streamOpenRouter(process.env.OPENROUTER_API_KEY!, active.model, messages)
    : streamAnthropic(process.env.ANTHROPIC_API_KEY!, active.model, messages);
}

// ── OpenRouter (OpenAI-compatible, free models e.g. Nemotron) ────────────────
async function streamOpenRouter(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://tdealer01-crypto-dsg-control-plane.vercel.app',
        'X-Title': 'DSG ONE ProofGate',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        stream: true,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        tools: OPENAI_TOOLS,
      }),
    });
  } catch (e) {
    return sseError(`Failed to reach OpenRouter: ${e instanceof Error ? e.message : e}`);
  }
  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '');
    return sseError(`OpenRouter ${upstream.status} (${model}): ${errText.slice(0, 200)}`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const emit = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      const reader = upstream.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';
      const toolCalls = new Map<number, { name: string; args: string }>();

      const flushTools = () => {
        for (const tc of toolCalls.values()) {
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(tc.args || '{}'); } catch { /* skip */ }
          emit({
            type: 'command',
            commandType: args.command_type ?? 'STATUS',
            target: args.target ?? '',
            reason: args.reason ?? tc.name,
          });
        }
        toolCalls.clear();
      };

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

            const choice = (ev.choices as Array<Record<string, unknown>> | undefined)?.[0];
            if (!choice) continue;
            const delta = choice.delta as Record<string, unknown> | undefined;

            if (typeof delta?.content === 'string' && delta.content.length > 0) {
              emit({ type: 'text', delta: delta.content });
            }

            const tcs = delta?.tool_calls as Array<Record<string, unknown>> | undefined;
            if (tcs) {
              for (const tc of tcs) {
                const idx = (tc.index as number) ?? 0;
                const fn = tc.function as Record<string, unknown> | undefined;
                const cur = toolCalls.get(idx) ?? { name: '', args: '' };
                if (typeof fn?.name === 'string') cur.name = fn.name;
                if (typeof fn?.arguments === 'string') cur.args += fn.arguments;
                toolCalls.set(idx, cur);
              }
            }

            if (choice.finish_reason) flushTools();
          }
        }
        flushTools();
        emit({ type: 'done' });
      } catch (e) {
        emit({ type: 'error', message: e instanceof Error ? e.message : 'Stream read error' });
      } finally {
        controller.close();
      }
    },
  });

  return sseResponse(stream);
}

// ── Anthropic Claude ─────────────────────────────────────────────────────────
async function streamAnthropic(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
): Promise<Response> {
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
        model,
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
      const emit = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

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

  return sseResponse(stream);
}

function sseResponse(stream: ReadableStream): Response {
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
