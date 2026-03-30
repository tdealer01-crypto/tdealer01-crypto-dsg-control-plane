import { NextResponse } from 'next/server';
import { requireActiveAgentFromBearer } from '../../../../lib/agent-auth';
import { callMCPTool, findMCPToolByName } from '../../../../lib/mcp-registry';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { sha256Hex } from '../../../../lib/runtime/canonical';

export const dynamic = 'force-dynamic';

type MCPCallBody = {
  agent_id?: string;
  tool_name?: string;
  input?: unknown;
  request_id?: string;
  approval_hash?: string;
  input_hash?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as MCPCallBody | null;
  if (!body?.agent_id || !body.request_id || !body.tool_name || !body.approval_hash || !body.input_hash) {
    return NextResponse.json(
      { ok: false, error: 'agent_id, request_id, tool_name, approval_hash, input_hash are required' },
      { status: 400 }
    );
  }

  const access = await requireActiveAgentFromBearer(request, body.agent_id);
  if (access.ok === false) {
    return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  }

  const toolName = body.tool_name.trim();
  const tool = findMCPToolByName(toolName);
  if (!tool) {
    return NextResponse.json({ ok: false, error: `Unknown tool: ${toolName}` }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  const { data: approval } = await supabase
    .from('approvals')
    .select('id, status, action, approval_hash, input_hash')
    .eq('org_id', access.orgId)
    .eq('agent_id', access.agentId)
    .eq('request_id', body.request_id)
    .maybeSingle();

  if (!approval || approval.status !== 'used') {
    return NextResponse.json({ ok: false, error: 'Approval not ready for MCP call' }, { status: 400 });
  }

  if (approval.approval_hash !== body.approval_hash || approval.input_hash !== body.input_hash) {
    return NextResponse.json({ ok: false, error: 'Approval hash or input hash mismatch' }, { status: 400 });
  }

  const startedAt = Date.now();
  const mcpInputHash = sha256Hex({ tool_name: toolName, input: body.input });

  const inserted = await supabase
    .from('mcp_tool_calls')
    .insert({
      org_id: access.orgId,
      agent_id: access.agentId,
      request_id: body.request_id,
      tool_name: toolName,
      approval_hash: body.approval_hash,
      input_hash: mcpInputHash,
      status: 'started',
      metadata: { callback_path: '/api/effect-callback' },
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (inserted.error || !inserted.data) {
    return NextResponse.json({ ok: false, error: inserted.error?.message || 'Failed to create tool call' }, { status: 500 });
  }

  const { data: effectRow } = await supabase
    .from('effects')
    .select('effect_id')
    .eq('org_id', access.orgId)
    .eq('request_id', body.request_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const result = await callMCPTool(tool, {
    agent_id: access.agentId,
    tool_name: toolName,
    input: body.input,
    request_id: body.request_id,
  });

  const latencyMs = Date.now() - startedAt;
  const resultHash = sha256Hex(result.data || {});

  await Promise.all([
    supabase
      .from('mcp_tool_calls')
      .update({
        status: result.ok ? 'completed' : 'failed',
        result_hash: resultHash,
        metadata: {
          tool_status: result.status,
          tool_ok: result.ok,
          tool_error: result.error,
          latency_ms: latencyMs,
        },
      })
      .eq('id', inserted.data.id),
    supabase.from('usage_events').insert({
      org_id: access.orgId,
      agent_id: access.agentId,
      event_type: 'mcp_tool_call',
      quantity: 1,
      unit: 'call',
      amount_usd: 0,
      metadata: {
        tool_name: toolName,
        request_id: body.request_id,
        latency_ms: latencyMs,
        callback_required: true,
      },
      created_at: new Date().toISOString(),
    }),
  ]);

  return NextResponse.json({
    ok: result.ok,
    tool_name: toolName,
    status: result.status,
    latency_ms: latencyMs,
    result: result.data,
    error: result.error,
    callback: {
      path: '/api/effect-callback',
      body: {
        agent_id: access.agentId,
        request_id: body.request_id,
        effect_id: effectRow?.effect_id || '',
        status: result.ok ? 'committed' : 'failed',
        payload: result.data || { error: result.error },
      },
    },
  });
}
