import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { getVault, updateVault, deleteVault, dispatchWebhookEvent } from '@/lib/hermes/managed-agents/store';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireOrgRole(['operator', 'org_admin', 'reviewer']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;
  try {
    const vault = await getVault(access.orgId, id);
    if (!vault) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(vault);
  } catch {
    return NextResponse.json({ error: 'Failed to get vault' }, { status: 500 });
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
    const updated = await updateVault(access.orgId, id, {
      display_name: body.display_name != null ? String(body.display_name) : undefined,
      metadata: typeof body.metadata === 'object' && body.metadata ? (body.metadata as Record<string, unknown>) : undefined,
    });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    dispatchWebhookEvent(access.orgId, 'vault.updated', updated);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update vault' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireOrgRole(['org_admin']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;
  try {
    await deleteVault(access.orgId, id);
    dispatchWebhookEvent(access.orgId, 'vault.deleted', { id });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Failed to delete vault' }, { status: 500 });
  }
}
