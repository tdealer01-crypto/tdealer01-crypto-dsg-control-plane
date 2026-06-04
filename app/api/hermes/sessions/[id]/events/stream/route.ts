import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { getSession, listSessionEvents } from '@/lib/hermes/managed-agents/store';

export const dynamic = 'force-dynamic';

const POLL_INTERVAL_MS = 1_000;
const MAX_DURATION_MS = 25_000;

function isTerminalEvent(event: { type: string; stop_reason?: unknown }): boolean {
  if (event.type === 'session.error') return true;
  if (event.type === 'session.status_idle') {
    // requires_action is non-terminal — stream must stay open for tool confirmations
    const sr = event.stop_reason;
    if (typeof sr === 'object' && sr !== null && (sr as Record<string, unknown>).type === 'requires_action') {
      return false;
    }
    return true;
  }
  return false;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireOrgRole(['operator', 'org_admin', 'reviewer']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;

  try {
    const session = await getSession(access.orgId, id);
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      let lastCreatedAt: string | undefined;
      let terminated = false;
      const deadline = Date.now() + MAX_DURATION_MS;

      try {
        // Emit all existing events
        const page = await listSessionEvents(access.orgId, id, { order: 'asc', limit: 500 });
        for (const evt of page.data) {
          send(evt.event);
          lastCreatedAt = evt.created_at;
          if (isTerminalEvent(evt.event)) terminated = true;
        }

        // Keep polling for new events until terminal event or timeout
        while (!terminated && Date.now() < deadline) {
          await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          if (Date.now() >= deadline) break;

          const newPage = await listSessionEvents(access.orgId, id, {
            order: 'asc',
            limit: 100,
            after: lastCreatedAt,
          });
          for (const evt of newPage.data) {
            send(evt.event);
            lastCreatedAt = evt.created_at;
            if (isTerminalEvent(evt.event)) terminated = true;
          }
        }
      } catch {
        send({ type: 'session.error', error: 'Stream failed', code: 'STREAM_ERROR' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
