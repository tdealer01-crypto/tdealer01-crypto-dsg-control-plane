import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { applyRateLimit, getRateLimitKey, buildRateLimitHeaders } from '../../../../lib/security/rate-limit';

export const dynamic = 'force-dynamic';

const OPENAI_BASE = 'https://api.openai.com/v1';

function sse(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

// POST /api/dsg-bridge/codex
// Streams responses from OpenAI codex-mini-latest via Responses API (SSE).
// Uses OPENAI_API_KEY already set in Vercel — free-tier eligible.
export async function POST(request: Request) {
  const rl = await applyRateLimit({
    key: getRateLimitKey(request, 'dsg-codex'),
    limit: 20,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'rate_limit_exceeded' }, { status: 429 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'OPENAI_API_KEY not configured' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.input) {
    return NextResponse.json({ ok: false, error: 'input is required' }, { status: 400 });
  }

  const payload = {
    model: body.model ?? 'codex-mini-latest',
    input: body.input,
    instructions: body.instructions ?? 'You are a DSG governance and audit agent. Reply in the same language as the user.',
    stream: true,
    tools: body.tools ?? [{ type: 'code_interpreter' }],
    ...(body.previous_response_id ? { previous_response_id: body.previous_response_id } : {}),
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let responseId: string | null = null;

      try {
        const res = await fetch(`${OPENAI_BASE}/responses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
          controller.enqueue(encoder.encode(sse({ type: 'error', error: (err as any).error?.message ?? 'OpenAI error' })));
          controller.close();
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          controller.enqueue(encoder.encode(sse({ type: 'error', error: 'no_stream' })));
          controller.close();
          return;
        }

        const dec = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });

          const lines = buf.split('\n');
          buf = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') continue;

            try {
              const event = JSON.parse(raw) as Record<string, unknown>;

              // Capture response ID for multi-turn
              if (event.type === 'response.created' && typeof event.response === 'object') {
                responseId = (event.response as any)?.id ?? null;
              }

              // Stream text deltas to client
              if (event.type === 'response.output_text.delta') {
                controller.enqueue(encoder.encode(sse({
                  type: 'token',
                  content: (event as any).delta ?? '',
                  model: 'codex-mini-latest',
                })));
              }

              // Done event
              if (event.type === 'response.completed') {
                controller.enqueue(encoder.encode(sse({
                  type: 'done',
                  responseId,
                  model: 'codex-mini-latest',
                })));
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(sse({
          type: 'error',
          error: err instanceof Error ? err.message : 'stream_error',
        })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...buildRateLimitHeaders(rl, 20),
    },
  });
}
