import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../lib/authz';
import { listAgentTools } from '../../../lib/agent/tools';

export async function GET() {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  return NextResponse.json({ items: listAgentTools() });
}
