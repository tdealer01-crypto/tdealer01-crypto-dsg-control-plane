import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

type AdapterEvent = {
  type?: string;
  reply?: string;
  decision?: 'ALLOW' | 'BLOCK' | 'REVIEW';
  steps?: Array<{ id?: string; toolId?: string }>;
  model?: string;
};

function parseSseEvent(raw: string): AdapterEvent | null {
  const line = raw
    .split('\n')
    .map((item) => item.trim())
    .find((item) => item.startsWith('data: '));

  if (!line) return null;

  try {
    return JSON.parse(line.slice(6)) as AdapterEvent;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const message = String(body.message ?? body.prompt ?? body.input ?? '').trim();

  if (!message) {
    return Response.json({ error: 'message required' }, { status: 400 });
  }

  const upstreamUrl = new URL('/api/dsg/hermes/execute', req.url);

  const upstream = await fetch(upstreamUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: req.headers.get('cookie') ?? '',
      authorization: req.headers.get('authorization') ?? '',
    },
    body: JSON.stringify({ message }),
    cache: 'no-store',
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '');
    return Response.json(
      {
        error: 'upstream hermes execute failed',
        message: text || upstream.statusText,
      },
      { status: upstream.status },
    );
  }

  if (!upstream.body) {
    return Response.json({ error: 'upstream stream missing' }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = '';
      let stepCount = 0;
      let completedSteps = 0;
      let decision: 'ALLOW' | 'BLOCK' | 'REVIEW' = 'REVIEW';

      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += new TextDecoder().decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const raw of events) {
            const event = parseSseEvent(raw);
            if (!event?.type) continue;

            if (event.type === 'preflight') {
              decision = event.decision ?? decision;
              send({ type: 'execution', decision, steps: stepCount, completed: false });
            }

            if (event.type === 'plan' && Array.isArray(event.steps)) {
              stepCount = event.steps.length;
              send({ type: 'execution', decision, steps: stepCount, completed: false });
            }

            if (event.type === 'step_result' || event.type === 'step_error') {
              completedSteps += 1;
              if (event.type === 'step_error') decision = 'REVIEW';
              send({
                type: 'execution',
                decision,
                steps: Math.max(stepCount, completedSteps),
                completed: false,
              });
            }

            if (event.type === 'assistant_reply' && event.reply) {
              if (event.decision) decision = event.decision;
              send({ type: 'content', content: `${event.reply}\n\n`, model: event.model });
            }

            if (event.type === 'done') {
              send({
                type: 'execution',
                decision,
                steps: Math.max(stepCount, completedSteps),
                completed: true,
              });
              send({ type: 'done' });
            }
          }
        }

        send({
          type: 'execution',
          decision,
          steps: Math.max(stepCount, completedSteps),
          completed: true,
        });
        send({ type: 'done' });
      } catch (error) {
        send({
          type: 'error',
          message: error instanceof Error ? error.message : 'Hermes adapter failed',
        });
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}
