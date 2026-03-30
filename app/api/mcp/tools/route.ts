import { NextResponse } from 'next/server';
import { requireActiveAgentFromBearer } from '../../../../lib/agent-auth';
import { getMCPToolRegistry } from '../../../../lib/mcp-registry';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const agentId = url.searchParams.get('agent_id');

  const access = await requireActiveAgentFromBearer(request, agentId);
  if (access.ok === false) {
    return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  }

  const tools = getMCPToolRegistry().map((tool) => ({
    name: tool.name,
    description: tool.description,
    method: tool.method || 'POST',
    timeout_ms: tool.timeout_ms,
  }));

  return NextResponse.json({
    ok: true,
    agent_id: access.agentId,
    org_id: access.orgId,
    tool_count: tools.length,
    tools,
  });
}
