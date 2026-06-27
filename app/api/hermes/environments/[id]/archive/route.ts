import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { archiveEnvironment } from '@/lib/hermes/managed-agents/store';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;
  try {
    const archived = await archiveEnvironment(access.orgId, id);
    if (!archived) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(archived);
  } catch {
    return NextResponse.json({ error: 'Failed to archive environment' }, { status: 500 });
  }
}
