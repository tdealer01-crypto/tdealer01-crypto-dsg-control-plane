import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { getSession, updateSession, deleteSession, dispatchWebhookEvent } from '@/lib/hermes/managed-agents/store';

export const dynamic = 'force-dynamic';

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
    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
}

export async function PATCH(
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

  try {
    const updated = await updateSession(access.orgId, id, {
      title: body.title != null ? String(body.title) : undefined,
      metadata: typeof body.metadata === 'object' && body.metadata ? (body.metadata as Record<string, unknown>) : undefined,
      vault_ids: Array.isArray(body.vault_ids) ? (body.vault_ids as string[]) : undefined,
    });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    dispatchWebhookEvent(access.orgId, 'session.updated', updated);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;
  try {
    await deleteSession(access.orgId, id);
    dispatchWebhookEvent(access.orgId, 'session.deleted', { id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
