import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { createEnvironment, listEnvironments } from '@/lib/hermes/managed-agents/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const access = await requireOrgRole(['operator', 'org_admin', 'reviewer']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const sp = req.nextUrl.searchParams;
  try {
    const page = await listEnvironments(access.orgId, {
      include_archived: sp.get('include_archived') === 'true',
      limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
      after: sp.get('after') ?? undefined,
    });
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: 'Failed to list environments' }, { status: 500 });
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

  if (!body.name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  try {
    const env = await createEnvironment(access.orgId, {
      name: String(body.name),
      config: typeof body.config === 'object' && body.config ? (body.config as any) : undefined,
      metadata: typeof body.metadata === 'object' && body.metadata ? (body.metadata as Record<string, unknown>) : undefined,
    });
    return NextResponse.json(env, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create environment' }, { status: 500 });
  }
}
