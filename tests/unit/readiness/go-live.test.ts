import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Adapted from PR #114. The original mock targeted the old `org_security_settings` /
 * `org_domains` schema. This version mocks the tables the re-ported `buildGoLiveReadinessReport`
 * actually reads on current `main`: users, org_sso_configs, billing_subscriptions,
 * sign_in_events, audit_logs, org_onboarding_states.
 */

type TableData = unknown[] | Record<string, unknown> | null;

/**
 * Builds a chainable PostgREST-like query stub. Every filter/modifier returns the same
 * builder; awaiting it (thenable) or calling `.maybeSingle()` resolves to `{ data, error }`.
 * `listData` is returned for list-style queries; `singleData` for `.maybeSingle()`.
 */
function makeBuilder(listData: TableData, singleData: TableData) {
  const result = { data: listData, error: null as null };
  const builder: Record<string, unknown> = {};
  const chain = () => builder;

  builder.select = chain;
  builder.eq = chain;
  builder.order = chain;
  builder.limit = chain;
  builder.maybeSingle = async () => ({ data: singleData, error: null });
  // Make the builder awaitable for list-style queries (no terminal .maybeSingle()).
  builder.then = (resolve: (value: typeof result) => unknown) => resolve(result);

  return builder;
}

function mockSupabase(overrides: Record<string, { list?: TableData; single?: TableData }> = {}) {
  return {
    getSupabaseAdmin: () => ({
      from: (table: string) => {
        const o = overrides[table] || {};
        return makeBuilder(o.list ?? [], o.single ?? null);
      },
    }),
  };
}

describe('go-live readiness', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('flags a blocker when there is no active owner', async () => {
    vi.doMock('../../../lib/supabase-server', () => mockSupabase({ users: { list: [] } }));

    const { buildGoLiveReadinessReport } = await import('../../../lib/readiness/go-live');
    const report = await buildGoLiveReadinessReport('org1');

    expect(report.status).toBe('not-ready');
    expect(report.blockers.length).toBeGreaterThan(0);
    expect(report.blockers.some((b) => b.toLowerCase().includes('owner'))).toBe(true);
  });

  it('returns needs-attention when owner exists but optional signals are missing', async () => {
    vi.doMock('../../../lib/supabase-server', () => mockSupabase({ users: { list: [{ id: 'u1' }] } }));

    const { buildGoLiveReadinessReport } = await import('../../../lib/readiness/go-live');
    const report = await buildGoLiveReadinessReport('org1');

    expect(report.blockers).toHaveLength(0);
    expect(report.status).toBe('needs-attention');
    expect(report.warnings.length).toBeGreaterThan(0);
  });

  it('returns ready when owner, SSO, billing, audit and onboarding are all satisfied', async () => {
    vi.doMock('../../../lib/supabase-server', () =>
      mockSupabase({
        users: { list: [{ id: 'u1' }] },
        org_sso_configs: { single: { provider: 'okta', is_enabled: true } },
        billing_subscriptions: { single: { plan_key: 'pro', status: 'active' } },
        sign_in_events: { list: [{ id: 's1' }] },
        audit_logs: { list: [{ id: 'a1' }] },
        org_onboarding_states: { single: { id: 'ob1', bootstrap_status: 'completed' } },
      }),
    );

    const { buildGoLiveReadinessReport } = await import('../../../lib/readiness/go-live');
    const report = await buildGoLiveReadinessReport('org1');

    expect(report.blockers).toHaveLength(0);
    expect(report.warnings).toHaveLength(0);
    expect(report.status).toBe('ready');

    const ids = report.categories.find((c) => c.name === 'Identity & access');
    expect(ids?.items.find((i) => i.key === 'sso_configured')?.ok).toBe(true);

    // Degraded signals with no backing column on current schema stay not-ok with a detail.
    const enforced = ids?.items.find((i) => i.key === 'sso_enforced');
    expect(enforced?.ok).toBe(false);
    expect(enforced?.detail).toMatch(/unknown/i);
  });
});
