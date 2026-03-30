import { NextResponse } from 'next/server';
import { requireActiveAgentFromBearer } from '../../../../lib/agent-auth';
import { callMCPTool, findMCPToolByName } from '../../../../lib/mcp-registry';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

type MCPCallBody = {
  agent_id?: string;
  tool_name?: string;
  input?: unknown;
  request_id?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as MCPCallBody | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const access = await requireActiveAgentFromBearer(request, body.agent_id);
  if (access.ok === false) {
    return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  }

  const toolName = typeof body.tool_name === 'string' ? body.tool_name.trim() : '';
  if (!toolName) {
    return NextResponse.json({ ok: false, error: 'tool_name is required' }, { status: 400 });
  }

  const tool = findMCPToolByName(toolName);
  if (!tool) {
    return NextResponse.json({ ok: false, error: `Unknown tool: ${toolName}` }, { status: 404 });
  }

  const startedAt = Date.now();
  const result = await callMCPTool(tool, {
    agent_id: access.agentId,
    tool_name: toolName,
    input: body.input,
    request_id: typeof body.request_id === 'string' ? body.request_id : undefined,
  });

  const latencyMs = Date.now() - startedAt;
  const supabase = getSupabaseAdmin();

  await supabase.from('usage_events').insert({
    org_id: access.orgId,
    agent_id: access.agentId,
    event_type: 'mcp_tool_call',
    quantity: 1,
    unit: 'call',
    amount_usd: 0,
    metadata: {
      tool_name: toolName,
      status: result.status,
      ok: result.ok,
      latency_ms: latencyMs,
      request_id: body.request_id || null,
    },
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: result.ok,
    tool_name: toolName,
    latency_ms: latencyMs,
    status: result.status,
    result: result.data,
    error: result.error,
  });
}
