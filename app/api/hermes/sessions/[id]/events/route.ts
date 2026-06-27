import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { getSession, listSessionEvents, appendUserEvent, dispatchWebhookEvent } from '@/lib/hermes/managed-agents/store';
import type { UserSentEvent } from '@/lib/hermes/managed-agents/types';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireOrgRole(['operator', 'org_admin', 'reviewer']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;
  const sp = req.nextUrl.searchParams;
  const eventTypes = sp.getAll('event_types');

  try {
    const page = await listSessionEvents(access.orgId, id, {
      event_types: eventTypes.length ? eventTypes : undefined,
      order: (sp.get('order') as 'asc' | 'desc') ?? 'asc',
      limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
      after: sp.get('after') ?? undefined,
    });
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: 'Failed to list session events' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const events: UserSentEvent[] = Array.isArray(body.events) ? (body.events as UserSentEvent[]) : [];
  if (events.length === 0) {
    return NextResponse.json({ error: 'events array is required' }, { status: 400 });
  }

  const validTypes = new Set(['user.message', 'user.interrupt', 'user.tool_confirmation', 'user.custom_tool_result', 'user.define_outcome']);
  for (const evt of events) {
    if (!validTypes.has(evt.type)) {
      return NextResponse.json({ error: `Invalid event type: ${evt.type}` }, { status: 400 });
    }
  }

  try {
    const session = await getSession(access.orgId, id);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Failed to verify session' }, { status: 500 });
  }

  try {
    const created = await Promise.all(
      events.map((evt) => appendUserEvent(access.orgId, id, evt)),
    );
    dispatchWebhookEvent(access.orgId, 'session.event', { session_id: id, events: created });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to send events' }, { status: 500 });
  }
}
