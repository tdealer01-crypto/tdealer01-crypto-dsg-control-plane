import { vi } from 'vitest';

describe('enterprise runtime proof', () => {
  it('summarizes verified runtime report verdict safely', async () => {
    const { summarizeVerifiedRuntimeReport } = await import('../../../lib/enterprise/proof-runtime');
    const summary = summarizeVerifiedRuntimeReport({
      report_class: 'verified_runtime',
      evidence_scope: 'org_agent_scoped',
      mode: 'verified_runtime',
      org_id: 'o1',
      agent_id: 'a1',
      generated_at: '2026-03-31T00:00:00.000Z',
      runtime_summary: { truth_epoch: 1, truth_sequence: 1, latest_truth_hash: 'h', latest_entry_hash: 'e' },
      approval_anti_replay: { replay_protected: true, terminal_approval_enforced: true, expired_rejected: true },
      truth_ledger_lineage: { latest_truth_sequence: 1, latest_ledger_sequence: 1, drift_detected: false },
      checkpoint_recovery: { pass: true, latest_checkpoint_sequence: 1, missing_lineage_count: 0 },
      effects: { recent_count: 1, callback_reconciled: true },
      governance: { runtime_roles: ['org_admin'], policy_count: 1, rbac_enforced: true },
      billing_operational_value: { executions_this_period: 1, usage_events: 1, billed_estimate_usd: 0.1 },
      source: { public_narrative_available: true, verified_runtime_available: true, generated_from: 'runtime_tables' },
      gaps: [],
    });

    expect(summary.final_verdict).toBe('verified');
  });

  it('builds runtime report with explicit gaps when data missing', async () => {
    vi.resetModules();
    const from = vi.fn((table: string) => {
      if (table === 'runtime_truth_states') return { select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }) }) };
      if (table === 'runtime_ledger_entries') return { select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }) }) };
      if (table === 'runtime_approval_requests') return { select: () => ({ eq: () => ({ eq: async () => ({ data: [], error: null }) }) }) };
      if (table === 'runtime_effects') return { select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }) }) }) };
      if (table === 'runtime_checkpoints') return { select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }) }) };
      if (table === 'runtime_roles') return { select: () => ({ eq: async () => ({ data: [], error: null }) }) };
      if (table === 'policies') return { select: () => ({ eq: async () => ({ count: 0, error: null }) }) };
      if (table === 'usage_counters') return { select: () => ({ eq: () => ({ eq: async () => ({ data: [], error: null }) }) }) };
      if (table === 'usage_events') return { select: () => ({ eq: () => ({ eq: async () => ({ data: [], error: null }) }) }) };
      if (table === 'executions') return { select: () => ({ eq: () => ({ eq: async () => ({ count: 0, error: null }) }) }) };
      return { select: async () => ({ data: [], error: null }) };
    });

    vi.doMock('../../../lib/supabase-server', () => ({ getSupabaseAdmin: () => ({ from }) }));
    vi.doMock('../../../lib/runtime/recovery', () => ({
      validateRuntimeRecovery: vi.fn(async () => ({ pass: false, hash_match: false, missing_lineage: ['x'], latest_ledger_sequence: 0 })),
    }));

    const { buildVerifiedRuntimeProofReport } = await import('../../../lib/enterprise/proof-runtime');
    const report = await buildVerifiedRuntimeProofReport({ orgId: 'o1', agentId: 'a1' });

    expect(report.gaps.length).toBeGreaterThan(0);
    expect(report.source.generated_from).toBe('runtime_tables');
  });
});
