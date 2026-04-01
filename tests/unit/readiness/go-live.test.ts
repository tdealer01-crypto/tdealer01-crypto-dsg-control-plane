import { describe, it, expect, vi } from 'vitest';

describe('go-live readiness', () => {
  it('returns blockers/warnings classification', async () => {
    vi.doMock('../../../lib/supabase-server', () => ({ getSupabaseAdmin: () => ({ from: (table: string) => ({ select: () => ({ eq: () => ({ eq: () => ({ eq: async () => ({ data: table === 'users' ? [] : [{ id: 'x' }], error: null }), limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }), limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }), maybeSingle: async () => ({ data: null, error: null }), order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }), order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }) }) }));
    const { buildGoLiveReadinessReport } = await import('../../../lib/readiness/go-live');
    const report = await buildGoLiveReadinessReport('org1');
    expect(report.status).toBe('not-ready');
    expect(report.blockers.length).toBeGreaterThan(0);
  });
});
