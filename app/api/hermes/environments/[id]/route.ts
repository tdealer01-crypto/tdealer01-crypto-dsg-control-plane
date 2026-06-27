import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { getEnvironment, updateEnvironment, deleteEnvironment } from '@/lib/hermes/managed-agents/store';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireOrgRole(['operator', 'org_admin', 'reviewer']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;
  try {
    const env = await getEnvironment(access.orgId, id);
    if (!env) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(env);
  } catch {
    return NextResponse.json({ error: 'Failed to get environment' }, { status: 500 });
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
    const updated = await updateEnvironment(access.orgId, id, {
      name: body.name != null ? String(body.name) : undefined,
      config: typeof body.config === 'object' && body.config ? (body.config as any) : undefined,
      metadata: typeof body.metadata === 'object' && body.metadata ? (body.metadata as Record<string, unknown>) : undefined,
    });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update environment' }, { status: 500 });
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
    await deleteEnvironment(access.orgId, id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Failed to delete environment' }, { status: 500 });
  }
}
