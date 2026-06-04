import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { listSessionThreads } from '@/lib/hermes/managed-agents/store';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireOrgRole(['operator', 'org_admin', 'reviewer']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;
  const sp = req.nextUrl.searchParams;

  try {
    const page = await listSessionThreads(access.orgId, id, {
      limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
      after: sp.get('after') ?? undefined,
    });
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: 'Failed to list session threads' }, { status: 500 });
  }
}
