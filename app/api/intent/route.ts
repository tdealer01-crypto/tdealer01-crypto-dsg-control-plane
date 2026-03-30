import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { requireActiveAgentFromBearer, type AgentAccess } from '../../../lib/agent-auth';
import { computeApprovalHash, computeInputHash, type IntentEnvelope } from '../../../lib/runtime/approval';

export const dynamic = 'force-dynamic';

const APPROVAL_TTL_MS = 10 * 60 * 1000;

type IntentBody = IntentEnvelope & {
  agent_id: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as IntentBody | null;
  if (!body?.request_id || !body?.action) {
    return NextResponse.json(
      { ok: false, error: 'request_id and action are required' },
      { status: 400 }
    );
  }

  const access = await requireActiveAgentFromBearer(request, body.agent_id);
  if (!access.ok) {
    const denied = access as Extract<AgentAccess, { ok: false }>;
    return NextResponse.json({ ok: false, error: denied.error }, { status: denied.status });
  }

  const supabase = getSupabaseAdmin();

  const { data: currentState, error: stateError } = await supabase
    .from('runtime_truth_state')
    .select('epoch')
    .eq('org_id', access.orgId)
    .maybeSingle();

  if (stateError) {
    return NextResponse.json({ ok: false, error: stateError.message }, { status: 500 });
  }

  const epoch = Number(currentState?.epoch || 1);
  const inputHash = computeInputHash(body);
  const approvalHash = computeApprovalHash({
    orgId: access.orgId,
    agentId: access.agentId,
    requestId: body.request_id,
    action: body.action,
    inputHash,
    epoch,
  });

  const expiresAt = new Date(Date.now() + APPROVAL_TTL_MS).toISOString();

  const { data, error } = await supabase
    .from('approvals')
    .upsert(
      {
        org_id: access.orgId,
        agent_id: access.agentId,
        request_id: body.request_id,
        action: body.action,
        input_hash: inputHash,
        approval_hash: approvalHash,
        expires_at: expiresAt,
        epoch,
        status: 'issued',
        metadata: {
          next_g: body.next_g,
          next_i: body.next_i,
        },
      },
      { onConflict: 'org_id,request_id' }
    )
    .select('id, approval_hash, expires_at, epoch, status')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to issue approval' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    approval_id: data.id,
    approval_hash: data.approval_hash,
    input_hash: inputHash,
    expires_at: data.expires_at,
    epoch: data.epoch,
    status: data.status,
  });
}
