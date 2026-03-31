import { vi } from 'vitest';

describe('validateRuntimeRecovery', () => {
  it('detects full lineage and hash match', async () => {
    vi.resetModules();

    const from = vi.fn((table: string) => {
      if (table === 'runtime_checkpoints') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { id: 'cp1', checkpoint_hash: 'h123', created_at: '2026-03-31T00:00:00Z', latest_ledger_entry_id: 'l2' } }) }) }) }) }),
          }),
        };
      }
      if (table === 'runtime_truth_states') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { id: 't2', canonical_hash: 'truth-hash' } }) }) }) }) }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({ eq: () => ({ order: async () => ({ data: [
            { id: 'l1', ledger_sequence: 1, truth_sequence: 1, truth_state_id: 't1' },
            { id: 'l2', ledger_sequence: 2, truth_sequence: 2, truth_state_id: 't2' },
          ] }) }) }),
        }),
      };
    });

    vi.doMock('../../../lib/supabase-server', () => ({ getSupabaseAdmin: () => ({ from }) }));
    vi.doMock('../../../lib/runtime/checkpoint', () => ({ buildCheckpointHash: () => 'h123' }));

    const { validateRuntimeRecovery } = await import('../../../lib/runtime/recovery');
    const result = await validateRuntimeRecovery({ orgId: 'o1', agentId: 'a1' });

    expect(result.pass).toBe(true);
    expect(result.hash_match).toBe(true);
    expect(result.missing_lineage).toHaveLength(0);
  });
});
