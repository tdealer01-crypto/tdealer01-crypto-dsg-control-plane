import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { createSession, listSessions, dispatchWebhookEvent } from '@/lib/hermes/managed-agents/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const access = await requireOrgRole(['operator', 'org_admin', 'reviewer']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const sp = req.nextUrl.searchParams;
  const statusesRaw = sp.getAll('statuses');

  try {
    const page = await listSessions(access.orgId, {
      agent_id: sp.get('agent_id') ?? undefined,
      agent_version: sp.get('agent_version') ? Number(sp.get('agent_version')) : undefined,
      statuses: statusesRaw.length ? (statusesRaw as any) : undefined,
      include_archived: sp.get('include_archived') === 'true',
      limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
      after: sp.get('after') ?? undefined,
    });
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.agent_id) {
    return NextResponse.json({ error: 'agent_id is required' }, { status: 400 });
  }

  try {
    const session = await createSession(access.orgId, {
      agent_id: String(body.agent_id),
      agent_version: body.agent_version != null ? Number(body.agent_version) : undefined,
      environment_id: body.environment_id != null ? String(body.environment_id) : undefined,
      vault_ids: Array.isArray(body.vault_ids) ? (body.vault_ids as string[]) : undefined,
      resources: Array.isArray(body.resources) ? (body.resources as any) : undefined,
      title: body.title != null ? String(body.title) : undefined,
      metadata: typeof body.metadata === 'object' && body.metadata ? (body.metadata as Record<string, unknown>) : undefined,
    });
    dispatchWebhookEvent(access.orgId, 'session.created', session);
    return NextResponse.json(session, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
