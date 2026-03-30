import { NextResponse } from 'next/server';
import { requireActiveAgentFromBearer } from '../../../lib/agent-auth';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import {
  computeApprovalHash,
  computeInputHash,
  type IntentEnvelope,
} from '../../../lib/runtime/approval';

export const dynamic = 'force-dynamic';

const APPROVAL_TTL_MS = 10 * 60 * 1000;

type IntentBody = IntentEnvelope & {
  agent_id?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as IntentBody | null;

  if (!body) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.request_id || !body.action) {
    return NextResponse.json(
      { ok: false, error: 'request_id and action are required' },
      { status: 400 }
    );
  }

  const access = await requireActiveAgentFromBearer(request, body.agent_id);
  if (access.ok === false) {
    return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  }

  const supabase = getSupabaseAdmin();

  const { data: truthState, error: truthError } = await supabase
    .from('runtime_truth_state')
    .select('epoch')
    .eq('org_id', access.orgId)
    .maybeSingle();

  if (truthError) {
    return NextResponse.json({ ok: false, error: truthError.message }, { status: 500 });
  }

  const epoch = Number(truthState?.epoch || 1);
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

  const { data: approval, error: approvalError } = await supabase
    .from('approvals')
    .upsert(
      {
        org_id: access.orgId,
        agent_id: access.agentId,
        request_id: body.request_id,
        action: body.action,
        input_hash: inputHash,
        approval_hash: approvalHash,
        approved_at: new Date().toISOString(),
        expires_at: expiresAt,
        epoch,
        status: 'issued',
        metadata: {
          next_g: body.next_g,
          next_i: body.next_i,
        },
      },
      {
        onConflict: 'org_id,request_id',
      }
    )
    .select('id, approval_hash, expires_at, epoch, status')
    .single();

  if (approvalError || !approval) {
    return NextResponse.json(
      { ok: false, error: approvalError?.message || 'Failed to issue approval' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    approval_id: approval.id,
    approval_hash: approval.approval_hash,
    input_hash: inputHash,
    expires_at: approval.expires_at,
    epoch: approval.epoch,
    status: approval.status,
  });
}
