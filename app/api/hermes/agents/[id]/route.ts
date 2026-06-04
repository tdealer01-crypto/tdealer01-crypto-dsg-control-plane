import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { getAgent, updateAgent, archiveAgent } from '@/lib/hermes/managed-agents/store';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireOrgRole(['operator', 'org_admin', 'reviewer']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;
  const version = req.nextUrl.searchParams.get('version');

  try {
    const agent = await getAgent(access.orgId, id, version ? Number(version) : undefined);
    if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(agent);
  } catch {
    return NextResponse.json({ error: 'Failed to get agent' }, { status: 500 });
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

  if (body.version == null || typeof body.version !== 'number') {
    return NextResponse.json({ error: 'version is required for optimistic lock' }, { status: 400 });
  }

  try {
    const updated = await updateAgent(access.orgId, id, body.version, {
      name: body.name != null ? String(body.name) : undefined,
      description: body.description != null ? String(body.description) : undefined,
      system: body.system != null ? String(body.system) : undefined,
      tools: Array.isArray(body.tools) ? (body.tools as any) : undefined,
      skills: Array.isArray(body.skills) ? (body.skills as string[]) : undefined,
      mcp_servers: Array.isArray(body.mcp_servers) ? (body.mcp_servers as any) : undefined,
      multiagent: body.multiagent as any,
      metadata: typeof body.metadata === 'object' && body.metadata ? (body.metadata as Record<string, unknown>) : undefined,
    });
    if (!updated) return NextResponse.json({ error: 'Not found or version conflict' }, { status: 409 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
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
    const archived = await archiveAgent(access.orgId, id);
    if (!archived) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(archived);
  } catch {
    return NextResponse.json({ error: 'Failed to archive agent' }, { status: 500 });
  }
}
