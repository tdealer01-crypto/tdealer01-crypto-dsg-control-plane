import { randomUUID, createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { canonicalHash, canonicalJson } from '../../../../lib/runtime/canonical';
import { buildCheckpointHash } from '../../../../lib/runtime/checkpoint';
import { getOverageRateUsd } from '../../../../lib/billing/overage-config';
import { handleApiError } from '../../../../lib/security/api-error';

function demoEnabled(request: Request) {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.ENABLE_DEMO_BOOTSTRAP !== 'true') return false;
  const expected = process.env.DEMO_BOOTSTRAP_TOKEN;
  if (!expected) return false;
  return request.headers.get('x-demo-token') === expected;
}

export async function POST(request: Request) {
  try {
    if (!demoEnabled(request)) {
      return NextResponse.json({ error: 'Demo bootstrap disabled' }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    const suffix = randomUUID().slice(0, 8);
    const orgId = `demo-org-${suffix}`;
    const agentId = `demo-agent-${suffix}`;
    const apiKey = `demo-${randomUUID()}`;
    const approvalId = randomUUID();

    await supabase.from('organizations').insert({ id: orgId, name: 'Enterprise Proof Demo' });
    await supabase.from('policies').upsert({ id: 'policy_default', name: 'Default DSG Policy', version: 'v1', status: 'active', config: {} });
    await supabase.from('agents').insert({
      id: agentId,
      org_id: orgId,
      name: 'Enterprise Agent',
      policy_id: 'policy_default',
      status: 'active',
      api_key_hash: createHash('sha256').update(apiKey).digest('hex'),
      monthly_limit: 1000,
    });

    const canonical = {
      action: 'enterprise_demo',
      input: { amount: 100, asset: 'USDC' },
      context: { source: 'enterprise_walkthrough' },
      decision: 'ALLOW',
      policyVersion: 'dsg-core-v1',
      reason: 'Deterministic safe action',
    };

    await supabase.from('runtime_approval_requests').insert({
      id: approvalId,
      org_id: orgId,
      agent_id: agentId,
      approval_key: `demo-${suffix}`,
      request_payload: canonical,
      status: 'pending',
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });

    const { data: commit, error: commitError } = await supabase.rpc('runtime_commit_execution', {
      p_org_id: orgId,
      p_agent_id: agentId,
      p_request_id: approvalId,
      p_decision: 'ALLOW',
      p_reason: 'Deterministic safe action',
      p_metadata: { action: 'enterprise_demo', stability_score: 0.94 },
      p_canonical_hash: canonicalHash(canonical),
      p_canonical_json: JSON.parse(canonicalJson(canonical)),
      p_latency_ms: 19,
      p_request_payload: canonical.input,
      p_context_payload: canonical.context,
      p_policy_version: 'dsg-core-v1',
      p_created_at: new Date().toISOString(),
    });

    if (commitError) {
      return handleApiError('api/demo/bootstrap', commitError, { details: { stage: 'runtime-commit-execution' } });
    }

    const commitRow = Array.isArray(commit) ? commit[0] : commit;
    if (!commitRow?.execution_id || !commitRow?.truth_state_id || !commitRow?.ledger_id) {
      return handleApiError('api/demo/bootstrap', new Error('Commit bootstrap failed to produce runtime lineage'), { details: { stage: 'lineage-check' } });
    }

    const checkpointHash = buildCheckpointHash({
      truthCanonicalHash: canonicalHash(canonical),
      latestLedgerId: String(commitRow.ledger_id),
      latestLedgerSequence: Number(commitRow.ledger_sequence || 0),
      latestTruthSequence: Number(commitRow.truth_sequence || 0),
    });

    await supabase.from('runtime_checkpoints').insert({
      org_id: orgId,
      agent_id: agentId,
      truth_state_id: commitRow.truth_state_id,
      latest_ledger_entry_id: commitRow.ledger_id,
      checkpoint_hash: checkpointHash,
      metadata: { source: 'demo_bootstrap' },
    });

    await supabase.from('runtime_roles').insert([
      { org_id: orgId, user_id: 'demo-user', role: 'org_admin' },
      { org_id: orgId, user_id: 'demo-user', role: 'runtime_auditor' },
      { org_id: orgId, user_id: 'demo-user', role: 'billing_admin' },
    ]);

    await supabase.from('usage_counters').insert({ org_id: orgId, agent_id: agentId, billing_period: new Date().toISOString().slice(0, 7), executions: 1 });
    await supabase.from('usage_events').insert({
      org_id: orgId,
      agent_id: agentId,
      execution_id: commitRow.execution_id,
      event_type: 'execution',
      quantity: 1,
      unit: 'execution',
      amount_usd: getOverageRateUsd(),
      metadata: { source: 'enterprise_demo' },
    });

    return NextResponse.json({ org_id: orgId, agent_id: agentId, execution_id: commitRow.execution_id, demo_mode: true });
  } catch (error) {
    return handleApiError('api/demo/bootstrap', error, { details: { stage: 'unhandled' } });
  }
}
