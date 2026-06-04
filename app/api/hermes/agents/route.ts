import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { createAgent, listAgents } from '@/lib/hermes/managed-agents/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const sp = req.nextUrl.searchParams;
  try {
    const page = await listAgents(access.orgId, {
      include_archived: sp.get('include_archived') === 'true',
      limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
      after: sp.get('after') ?? undefined,
    });
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: 'Failed to list agents' }, { status: 500 });
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

  if (!body.model || !body.name) {
    return NextResponse.json({ error: 'model and name are required' }, { status: 400 });
  }

  try {
    const agent = await createAgent(access.orgId, {
      model: String(body.model),
      name: String(body.name),
      description: body.description != null ? String(body.description) : undefined,
      system: body.system != null ? String(body.system) : undefined,
      tools: Array.isArray(body.tools) ? (body.tools as any) : undefined,
      skills: Array.isArray(body.skills) ? (body.skills as string[]) : undefined,
      mcp_servers: Array.isArray(body.mcp_servers) ? (body.mcp_servers as any) : undefined,
      multiagent: body.multiagent as any,
      metadata: typeof body.metadata === 'object' && body.metadata ? (body.metadata as Record<string, unknown>) : undefined,
    });
    return NextResponse.json(agent, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
