import { NextResponse } from 'next/server';
import { requireActiveAgentFromBearer } from '../../../../lib/agent-auth';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { computeMemoryLineageHash } from '../../../../lib/runtime/approval';
import { sha256Hex } from '../../../../lib/runtime/canonical';

export const dynamic = 'force-dynamic';

type MemoryWriteBody = {
  agent_id?: string;
  request_id?: string;
  approval_id?: string;
  memory_key?: string;
  memory_value?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as MemoryWriteBody | null;

  if (!body) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.request_id || !body.approval_id || !body.memory_key) {
    return NextResponse.json(
      { ok: false, error: 'request_id, approval_id, and memory_key are required' },
      { status: 400 }
    );
  }

  const access = await requireActiveAgentFromBearer(request, body.agent_id);
  if (access.ok === false) {
    return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  }

  const supabase = getSupabaseAdmin();

  const inputHash = sha256Hex({
    memory_key: body.memory_key,
    memory_value: body.memory_value ?? {},
  });

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

  const allowedAction = typeof approval.action === 'string' ? approval.action : '';

  if (allowedAction !== 'memory.write') {
    return NextResponse.json({ ok: false, error: 'ERR_ACTION_MISMATCH' }, { status: 400 });
  }

  if (approval.input_hash !== inputHash) {
    return NextResponse.json({ ok: false, error: 'ERR_INTEGRITY_MISMATCH' }, { status: 400 });
  }

  const lineageHash = computeMemoryLineageHash({
    orgId: access.orgId,
    agentId: access.agentId,
    requestId: body.request_id,
    memoryKey: body.memory_key,
    memoryValue: body.memory_value ?? {},
  });

  const nowIso = new Date().toISOString();

  const { error: memoryInsertError } = await supabase.from('agent_memory').insert({
    org_id: access.orgId,
    agent_id: access.agentId,
    request_id: body.request_id,
    memory_key: body.memory_key,
    memory_value: body.memory_value ?? {},
    lineage_hash: lineageHash,
    created_at: nowIso,
  });

  if (memoryInsertError) {
    return NextResponse.json({ ok: false, error: memoryInsertError.message }, { status: 500 });
  }

  const { error: approvalUpdateError } = await supabase
    .from('approvals')
    .update({
      status: 'used',
      used_at: nowIso,
      metadata: {
        ...(approval.metadata || {}),
        memory_key: body.memory_key,
        lineage_hash: lineageHash,
        final_status: 'committed',
      },
    })
    .eq('id', approval.id);

  if (approvalUpdateError) {
    return NextResponse.json({ ok: false, error: approvalUpdateError.message }, { status: 500 });
  }

  const { error: usageError } = await supabase.from('usage_events').insert({
    org_id: access.orgId,
    agent_id: access.agentId,
    event_type: 'memory_write',
    quantity: 1,
    unit: 'write',
    amount_usd: 0,
    metadata: {
      request_id: body.request_id,
      memory_key: body.memory_key,
      lineage_hash: lineageHash,
    },
    created_at: nowIso,
  });

  if (usageError) {
    return NextResponse.json({ ok: false, error: usageError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    request_id: body.request_id,
    approval_id: approval.id,
    approval_hash: approval.approval_hash,
    memory_key: body.memory_key,
    lineage_hash: lineageHash,
  });
}
