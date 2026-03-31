import { vi } from 'vitest';

describe('/api/enterprise-proof/runtime-report', () => {
  it('returns 400 when org_id/agent_id are missing', async () => {
    vi.resetModules();
    vi.doMock('../../../lib/authz', () => ({ requireOrgRole: vi.fn(async () => ({ ok: true, orgId: 'o1', userId: 'u1' })) }));
    const { GET } = await import('../../../app/api/enterprise-proof/runtime-report/route');
    const res = await GET(new Request('http://localhost/api/enterprise-proof/runtime-report'));
    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthorized', async () => {
    vi.resetModules();
    vi.doMock('../../../lib/authz', () => ({ requireOrgRole: vi.fn(async () => ({ ok: false, status: 401, error: 'Unauthorized' })) }));
    const { GET } = await import('../../../app/api/enterprise-proof/runtime-report/route');
    const res = await GET(new Request('http://localhost/api/enterprise-proof/runtime-report?org_id=o1&agent_id=a1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 for cross-org access', async () => {
    vi.resetModules();
    vi.doMock('../../../lib/authz', () => ({ requireOrgRole: vi.fn(async () => ({ ok: true, orgId: 'o1', userId: 'u1' })) }));
    const { GET } = await import('../../../app/api/enterprise-proof/runtime-report/route');
    const res = await GET(new Request('http://localhost/api/enterprise-proof/runtime-report?org_id=o2&agent_id=a1'));
    expect(res.status).toBe(403);
  });

  it('returns 200 for valid scoped request', async () => {
    vi.resetModules();
    vi.doMock('../../../lib/authz', () => ({ requireOrgRole: vi.fn(async () => ({ ok: true, orgId: 'o1', userId: 'u1' })) }));
    vi.doMock('../../../lib/enterprise/proof-runtime', () => ({
      buildVerifiedRuntimeProofReport: vi.fn(async () => ({
        report_class: 'verified_runtime',
        evidence_scope: 'org_agent_scoped',
        mode: 'verified_runtime',
        org_id: 'o1',
        agent_id: 'a1',
        generated_at: '2026-03-31T00:00:00.000Z',
        runtime_summary: { truth_epoch: null, truth_sequence: null, latest_truth_hash: null, latest_entry_hash: null },
        approval_anti_replay: { replay_protected: false, terminal_approval_enforced: false, expired_rejected: false },
        truth_ledger_lineage: { latest_truth_sequence: null, latest_ledger_sequence: null, drift_detected: false },
        checkpoint_recovery: { pass: false, latest_checkpoint_sequence: null, missing_lineage_count: 0 },
        effects: { recent_count: 0, callback_reconciled: false },
        governance: { runtime_roles: [], policy_count: 0, rbac_enforced: false },
        billing_operational_value: { executions_this_period: 0, usage_events: 0, billed_estimate_usd: 0 },
        source: { public_narrative_available: true, verified_runtime_available: true, generated_from: 'runtime_tables' },
        gaps: [],
      })),
    }));

    const from = vi.fn(() => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'a1' }, error: null }) }) }) }),
      insert: async () => ({ error: null }),
    }));

    vi.doMock('../../../lib/supabase-server', () => ({ getSupabaseAdmin: () => ({ from }) }));

    const { GET } = await import('../../../app/api/enterprise-proof/runtime-report/route');
    const res = await GET(new Request('http://localhost/api/enterprise-proof/runtime-report?org_id=o1&agent_id=a1'));
    expect(res.status).toBe(200);
  });
});

describe('/api/enterprise-proof/runtime-report/summary', () => {
  it('returns 403 for cross-org access', async () => {
    vi.resetModules();
    vi.doMock('../../../lib/authz', () => ({ requireOrgRole: vi.fn(async () => ({ ok: true, orgId: 'o1', userId: 'u1' })) }));
    const { GET } = await import('../../../app/api/enterprise-proof/runtime-report/summary/route');
    const res = await GET(new Request('http://localhost/api/enterprise-proof/runtime-report/summary?org_id=o2&agent_id=a1'));
    expect(res.status).toBe(403);
  });
});
