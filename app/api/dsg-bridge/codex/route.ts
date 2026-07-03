import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { applyRateLimit, getRateLimitKey, buildRateLimitHeaders } from '../../../../lib/security/rate-limit';

export const dynamic = 'force-dynamic';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

// Free code-capable models via OpenRouter — tried in order on 429.
const FREE_MODELS = [
  process.env.OPENROUTER_MODEL_CODEX || 'deepseek/deepseek-chat-v3-0324:free',
  'meta-llama/llama-4-maverick:free',
  'google/gemma-3-27b-it:free',
  'deepseek/deepseek-r1-0528:free',
];

function sse(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

// POST /api/dsg-bridge/codex
// Streams responses from OpenRouter free models (chat completions SSE).
// Uses OPENROUTER_API_KEY — no paid OpenAI key required.
export async function POST(request: Request) {
  const rl = await applyRateLimit({
    key: getRateLimitKey(request, 'dsg-codex'),
    limit: 20,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'rate_limit_exceeded' }, { status: 429 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'OPENROUTER_API_KEY not configured' }, { status: 503 });
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

  const systemPrompt = body.instructions
    ?? 'You are a DSG governance and audit agent. Reply in the same language as the user.';

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (payload: unknown) =>
        controller.enqueue(encoder.encode(sse(payload)));

      for (const model of FREE_MODELS) {
        try {
          const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: body.input },
              ],
              stream: true,
              max_tokens: body.max_tokens ?? 1000,
              temperature: body.temperature ?? 0.7,
            }),
          });

          if (res.status === 429) {
            const detail = await res.text().catch(() => '');
            console.error(
              `[dsg-bridge/codex] OpenRouter 429 for "${model}", trying next: ${detail.slice(0, 200)}`,
            );
            continue;
          }

          if (!res.ok) {
            const detail = await res.text().catch(() => '');
            console.error(
              `[dsg-bridge/codex] OpenRouter ${res.status} for "${model}": ${detail.slice(0, 300)}`,
            );
            enqueue({ type: 'error', error: `LLM error ${res.status}` });
            controller.close();
            return;
          }

          const reader = res.body?.getReader();
          if (!reader) {
            enqueue({ type: 'error', error: 'no_stream' });
            controller.close();
            return;
          }

          const dec = new TextDecoder();
          let buf = '';
          let fullContent = '';

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
                const chunk = JSON.parse(raw) as Record<string, unknown>;
                const delta = (chunk as any).choices?.[0]?.delta?.content;
                if (typeof delta === 'string' && delta) {
                  fullContent += delta;
                  enqueue({ type: 'token', content: delta, model });
                }
              } catch {
                // skip malformed SSE lines
              }
            }
          }

          // Emit done with a synthetic responseId so the widget can track turns.
          enqueue({
            type: 'done',
            responseId: `or-${Date.now()}`,
            model,
          });
          controller.close();
          return;
        } catch (err) {
          console.error(`[dsg-bridge/codex] Unexpected error for "${model}":`, err);
          enqueue({ type: 'error', error: 'stream_error' });
          controller.close();
          return;
        }
      }

      // All models exhausted
      enqueue({ type: 'error', error: 'All models rate-limited — try again later' });
      controller.close();
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
