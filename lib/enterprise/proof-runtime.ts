import { validateRuntimeRecovery } from '../runtime/recovery';
import { getSupabaseAdmin } from '../supabase-server';
import type { VerifiedRuntimeProofReport, VerifiedRuntimeProofSummary } from './proof-types';

export async function buildVerifiedRuntimeProofReport(input: { orgId: string; agentId: string }): Promise<VerifiedRuntimeProofReport> {
  const supabase = getSupabaseAdmin();
  const { orgId, agentId } = input;
  const gaps: string[] = [];

  const [
    truthRes,
    ledgerRes,
    approvalRes,
    effectsRes,
    checkpointsRes,
    rolesRes,
    policiesRes,
    usageCounterRes,
    usageEventsRes,
    executionsRes,
    recovery,
  ] = await Promise.all([
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
      .select('id, ledger_sequence, truth_sequence')
      .eq('org_id', orgId)
      .eq('agent_id', agentId)
      .order('ledger_sequence', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('runtime_approval_requests')
      .select('status')
      .eq('org_id', orgId)
      .eq('agent_id', agentId),
    supabase
      .from('runtime_effects')
      .select('status, callback_count')
      .eq('org_id', orgId)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('runtime_checkpoints')
      .select('id, created_at')
      .eq('org_id', orgId)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('runtime_roles').select('role').eq('org_id', orgId),
    supabase.from('policies').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('usage_counters').select('executions').eq('org_id', orgId).eq('agent_id', agentId),
    supabase.from('usage_events').select('amount_usd').eq('org_id', orgId).eq('agent_id', agentId),
    supabase.from('executions').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('agent_id', agentId),
    validateRuntimeRecovery({ orgId, agentId }),
  ]);

  if (truthRes.error) gaps.push(`runtime_truth_states unavailable: ${truthRes.error.message}`);
  if (ledgerRes.error) gaps.push(`runtime_ledger_entries unavailable: ${ledgerRes.error.message}`);
  if (approvalRes.error) gaps.push(`runtime_approval_requests unavailable: ${approvalRes.error.message}`);
  if (effectsRes.error) gaps.push(`runtime_effects unavailable: ${effectsRes.error.message}`);
  if (checkpointsRes.error) gaps.push(`runtime_checkpoints unavailable: ${checkpointsRes.error.message}`);
  if (rolesRes.error) gaps.push(`runtime_roles unavailable: ${rolesRes.error.message}`);
  if (policiesRes.error) gaps.push(`policies unavailable: ${policiesRes.error.message}`);
  if (usageCounterRes.error) gaps.push(`usage_counters unavailable: ${usageCounterRes.error.message}`);
  if (usageEventsRes.error) gaps.push(`usage_events unavailable: ${usageEventsRes.error.message}`);
  if (executionsRes.error) gaps.push(`executions unavailable: ${executionsRes.error.message}`);

  const approvals = approvalRes.data || [];
  const effects = effectsRes.data || [];
  const roles = Array.from(new Set((rolesRes.data || []).map((row) => String(row.role))));
  const usageEvents = usageEventsRes.data || [];

  const expiredCount = approvals.filter((row) => row.status === 'expired' || row.status === 'rejected').length;
  const pendingCount = approvals.filter((row) => row.status === 'pending').length;
  const consumedCount = approvals.filter((row) => row.status === 'consumed').length;
  const reconciledEffects = effects.filter((row) => row.status !== 'pending' && Number(row.callback_count || 0) > 0).length;

  if (!truthRes.data) gaps.push('No runtime truth state found for org/agent scope');
  if (!ledgerRes.data) gaps.push('No runtime ledger entries found for org/agent scope');
  if (!checkpointsRes.data) gaps.push('No runtime checkpoint found for org/agent scope');
  if (approvals.length === 0) gaps.push('No approval records found for org/agent scope');

  const report: VerifiedRuntimeProofReport = {
    report_class: 'verified_runtime',
    evidence_scope: 'org_agent_scoped',
    mode: 'verified_runtime',
    org_id: orgId,
    agent_id: agentId,
    generated_at: new Date().toISOString(),
    runtime_summary: {
      truth_epoch: truthRes.data?.created_at ? Date.parse(truthRes.data.created_at) : null,
      truth_sequence: ledgerRes.data?.truth_sequence ? Number(ledgerRes.data.truth_sequence) : null,
      latest_truth_hash: truthRes.data?.canonical_hash || null,
      latest_entry_hash: ledgerRes.data?.id || null,
    },
    approval_anti_replay: {
      replay_protected: consumedCount > 0 && pendingCount === 0,
      terminal_approval_enforced: consumedCount + expiredCount > 0,
      expired_rejected: expiredCount > 0,
    },
    truth_ledger_lineage: {
      latest_truth_sequence: ledgerRes.data?.truth_sequence ? Number(ledgerRes.data.truth_sequence) : null,
      latest_ledger_sequence: ledgerRes.data?.ledger_sequence ? Number(ledgerRes.data.ledger_sequence) : null,
      drift_detected: !recovery.hash_match || recovery.missing_lineage.length > 0,
    },
    checkpoint_recovery: {
      pass: recovery.pass,
      latest_checkpoint_sequence: recovery.latest_ledger_sequence ? Number(recovery.latest_ledger_sequence) : null,
      missing_lineage_count: recovery.missing_lineage.length,
    },
    effects: {
      recent_count: effects.length,
      callback_reconciled: reconciledEffects > 0,
    },
    governance: {
      runtime_roles: roles,
      policy_count: Number(policiesRes.count || 0),
      rbac_enforced: roles.length > 0,
    },
    billing_operational_value: {
      executions_this_period: (usageCounterRes.data || []).reduce((sum, row) => sum + Number(row.executions || 0), 0),
      usage_events: usageEvents.length,
      billed_estimate_usd: Number(usageEvents.reduce((sum, row) => sum + Number(row.amount_usd || 0), 0).toFixed(4)),
    },
    source: {
      public_narrative_available: true,
      verified_runtime_available: true,
      generated_from: 'runtime_tables',
    },
    gaps,
  };

  return report;
}

export function summarizeVerifiedRuntimeReport(report: VerifiedRuntimeProofReport): VerifiedRuntimeProofSummary {
  const noGaps = report.gaps.length === 0;
  const finalVerdict: VerifiedRuntimeProofSummary['final_verdict'] =
    noGaps && !report.truth_ledger_lineage.drift_detected && report.checkpoint_recovery.pass && report.governance.rbac_enforced
      ? 'verified'
      : report.runtime_summary.latest_truth_hash
        ? 'partial'
        : 'insufficient_evidence';

  return {
    report_class: 'verified_runtime_summary',
    mode: 'verified_runtime',
    org_id: report.org_id,
    agent_id: report.agent_id,
    generated_at: report.generated_at,
    final_verdict: finalVerdict,
    drift_detected: report.truth_ledger_lineage.drift_detected,
    replay_protected: report.approval_anti_replay.replay_protected,
    checkpoint_pass: report.checkpoint_recovery.pass,
    rbac_enforced: report.governance.rbac_enforced,
    gaps: report.gaps,
  };
}
