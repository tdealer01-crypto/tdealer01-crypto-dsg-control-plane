import { NextResponse } from 'next/server';
import { requireActiveAgentFromBearer } from '../../../../lib/agent-auth';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { callMCPTool, findMCPToolByName } from '../../../../lib/mcp-registry';
import { sha256Hex } from '../../../../lib/runtime/canonical';
import { computeEffectId } from '../../../../lib/runtime/approval';
import { applyEffectCallback, createEffectJournalEntry } from '../../../../lib/runtime/effects';

export const dynamic = 'force-dynamic';

type MCPCallBody = {
  agent_id?: string;
  request_id?: string;
  approval_id?: string;
  tool_name?: string;
  input?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as MCPCallBody | null;

  if (!body) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.request_id || !body.approval_id || !body.tool_name) {
    return NextResponse.json(
      { ok: false, error: 'request_id, approval_id, and tool_name are required' },
      { status: 400 }
    );
  }

  const access = await requireActiveAgentFromBearer(request, body.agent_id);
  if (access.ok === false) {
    return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  }

  const supabase = getSupabaseAdmin();
  const tool = findMCPToolByName(body.tool_name.trim());
  if (!tool) {
    return NextResponse.json({ ok: false, error: `Unknown tool: ${body.tool_name}` }, { status: 404 });
  }

  const inputHash = sha256Hex({ tool_name: body.tool_name, input: body.input ?? {} });

  const { data: approval, error: approvalError } = await supabase
    .from('approvals')
    .select('*')
    .eq('id', body.approval_id)
    .eq('org_id', access.orgId)
    .eq('agent_id', access.agentId)
    .single();

  if (approvalError || !approval) {
    return NextResponse.json({ ok: false, error: 'ERR_INVALID_APPROVAL' }, { status: 400 });
  }

  if (approval.status !== 'issued' || approval.used_at) {
    return NextResponse.json({ ok: false, error: 'ERR_REPLAY_ATTACK' }, { status: 409 });
  }

  if (new Date(approval.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: 'ERR_EXPIRED' }, { status: 400 });
  }

  if (approval.request_id !== body.request_id) {
    return NextResponse.json({ ok: false, error: 'ERR_REQUEST_MISMATCH' }, { status: 400 });
  }

  const allowedToolName = typeof approval.metadata?.tool_name === 'string' ? approval.metadata.tool_name : null;
  if (allowedToolName && allowedToolName !== body.tool_name) {
    return NextResponse.json({ ok: false, error: 'ERR_TOOL_MISMATCH' }, { status: 400 });
  }

  const allowedInputHash =
    typeof approval.metadata?.tool_input_hash === 'string' ? String(approval.metadata.tool_input_hash) : null;
  if (allowedInputHash && allowedInputHash !== inputHash) {
    return NextResponse.json({ ok: false, error: 'ERR_TOOL_INPUT_HASH_MISMATCH' }, { status: 400 });
  }

  const effectId = computeEffectId({
    epoch: Number(approval.epoch),
    sequence: Number(approval.metadata?.sequence_hint || 0),
    action: `tool:${body.tool_name}`,
    payloadHash: inputHash,
  });

  await createEffectJournalEntry({
    orgId: access.orgId,
    agentId: access.agentId,
    requestId: body.request_id,
    action: `tool:${body.tool_name}`,
    effectId,
    payloadHash: inputHash,
    status: 'started',
    externalReceipt: {},
  });

  const startedAt = Date.now();
  const result = await callMCPTool(tool, {
    agent_id: access.agentId,
    tool_name: body.tool_name,
    input: body.input ?? {},
    request_id: body.request_id,
  });

  const resultHash = sha256Hex(result.data ?? { error: result.error, status: result.status });
  const nowIso = new Date().toISOString();

  const { error: callInsertError } = await supabase.from('mcp_tool_calls').insert({
    org_id: access.orgId,
    agent_id: access.agentId,
    request_id: body.request_id,
    tool_name: body.tool_name,
    approval_hash: approval.approval_hash,
    input_hash: inputHash,
    result_hash: resultHash,
    effect_id: effectId,
    status: result.ok ? 'committed' : 'failed',
    metadata: {
      latency_ms: Date.now() - startedAt,
      response_status: result.status,
      response_error: result.error,
      callback_route: '/api/effect-callback',
    },
    created_at: nowIso,
  });

  if (callInsertError) {
    return NextResponse.json({ ok: false, error: callInsertError.message }, { status: 500 });
  }

  await applyEffectCallback({
    effectId,
    status: result.ok ? 'committed' : 'failed',
    result: result.data,
    receipt: { status: result.status, error: result.error || null },
  });

  const { error: approvalUpdateError } = await supabase
    .from('approvals')
    .update({
      status: result.ok ? 'used' : 'revoked',
      used_at: nowIso,
      metadata: {
        ...(approval.metadata || {}),
        tool_name: body.tool_name,
        tool_input_hash: inputHash,
        result_hash: resultHash,
        effect_id: effectId,
        final_status: result.ok ? 'committed' : 'failed',
      },
    })
    .eq('id', approval.id);

  if (approvalUpdateError) {
    return NextResponse.json({ ok: false, error: approvalUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: result.ok,
    request_id: body.request_id,
    tool_name: body.tool_name,
    approval_id: approval.id,
    approval_hash: approval.approval_hash,
    input_hash: inputHash,
    result_hash: resultHash,
    effect_id: effectId,
    callback_route: '/api/effect-callback',
    status: result.status,
    result: result.data,
    error: result.error,
  });
}
