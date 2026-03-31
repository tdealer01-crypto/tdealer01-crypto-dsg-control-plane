import { getSupabaseAdmin } from '../supabase-server';
import { validateRuntimeRecovery } from '../runtime/recovery';

export type EnterpriseProofReport = {
  org_id: string;
  agent_id: string;
  generated_at: string;
  approval_anti_replay: {
    pending: number;
    consumed: number;
    replay_protected: boolean;
  };
  truth_ledger_lineage: {
    latest_truth_hash: string | null;
    latest_ledger_sequence: number;
    latest_truth_sequence: number;
    drift_detected: boolean;
  };
  checkpoint_recovery: {
    pass: boolean;
    checkpoint_hash: string | null;
    recomputed_checkpoint_hash: string | null;
    missing_lineage_count: number;
  };
  governance: {
    runtime_roles: string[];
    policy_count: number;
  };
  billing_operational_value: {
    executions_this_period: number;
    usage_events: number;
    billed_estimate_usd: number;
  };
};

export async function buildEnterpriseProofReport(input: { orgId: string; agentId: string }) {
  const supabase = getSupabaseAdmin();
  const { orgId, agentId } = input;

  const [approvalsRes, truthRes, ledgerRes, rolesRes, policiesRes, usageCounterRes, usageEventsRes, recovery] = await Promise.all([
    supabase.from('runtime_approval_requests').select('status').eq('org_id', orgId).eq('agent_id', agentId),
    supabase
      .from('runtime_truth_states')
      .select('canonical_hash, created_at')
      .eq('org_id', orgId)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('runtime_ledger_entries')
      .select('ledger_sequence, truth_sequence')
      .eq('org_id', orgId)
      .eq('agent_id', agentId)
      .order('ledger_sequence', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('runtime_roles').select('role').eq('org_id', orgId),
    supabase.from('policies').select('id', { count: 'exact', head: true }),
    supabase.from('usage_counters').select('executions').eq('org_id', orgId).eq('agent_id', agentId),
    supabase.from('usage_events').select('amount_usd').eq('org_id', orgId).eq('agent_id', agentId),
    validateRuntimeRecovery({ orgId, agentId }),
  ]);

  const approvals = approvalsRes.data || [];
  const pending = approvals.filter((x) => x.status === 'pending').length;
  const consumed = approvals.filter((x) => x.status === 'consumed').length;
  const executionsThisPeriod = (usageCounterRes.data || []).reduce((sum, row) => sum + Number(row.executions || 0), 0);
  const usageEvents = usageEventsRes.data || [];
  const billedEstimateUsd = usageEvents.reduce((sum, row) => sum + Number(row.amount_usd || 0), 0);

  const report: EnterpriseProofReport = {
    org_id: orgId,
    agent_id: agentId,
    generated_at: new Date().toISOString(),
    approval_anti_replay: {
      pending,
      consumed,
      replay_protected: consumed > 0 && pending === 0,
    },
    truth_ledger_lineage: {
      latest_truth_hash: truthRes.data?.canonical_hash || null,
      latest_ledger_sequence: Number(ledgerRes.data?.ledger_sequence || 0),
      latest_truth_sequence: Number(ledgerRes.data?.truth_sequence || 0),
      drift_detected: !recovery.hash_match || recovery.missing_lineage.length > 0,
    },
    checkpoint_recovery: {
      pass: recovery.pass,
      checkpoint_hash: recovery.latest_checkpoint?.checkpoint_hash || null,
      recomputed_checkpoint_hash: recovery.recomputed_checkpoint_hash,
      missing_lineage_count: recovery.missing_lineage.length,
    },
    governance: {
      runtime_roles: Array.from(new Set((rolesRes.data || []).map((row) => String(row.role)))),
      policy_count: Number(policiesRes.count || 0),
    },
    billing_operational_value: {
      executions_this_period: executionsThisPeriod,
      usage_events: usageEvents.length,
      billed_estimate_usd: Number(billedEstimateUsd.toFixed(4)),
    },
  };

  return report;
}
