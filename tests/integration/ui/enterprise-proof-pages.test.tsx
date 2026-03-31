import { renderToStaticMarkup } from 'react-dom/server';
import { vi } from 'vitest';

describe('enterprise proof pages', () => {
  it('public report page shows verified runtime CTA', async () => {
    const { default: ReportPage } = await import('../../../app/enterprise-proof/report/page');
    const html = renderToStaticMarkup(ReportPage());
    expect(html).toContain('Open Verified Runtime Report');
    expect(html).toContain('public, AI-first narrative');
  });

  it('verified report page renders runtime evidence sections', async () => {
    vi.resetModules();
    vi.doMock('../../../lib/supabase/server', () => ({
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { org_id: 'o1', is_active: true } }) }),
          }),
        }),
      }),
    }));

    vi.doMock('../../../lib/enterprise/proof-runtime', () => ({
      buildVerifiedRuntimeProofReport: vi.fn(async () => ({
        report_class: 'verified_runtime',
        evidence_scope: 'org_agent_scoped',
        mode: 'verified_runtime',
        org_id: 'o1',
        agent_id: 'a1',
        generated_at: '2026-03-31T00:00:00.000Z',
        runtime_summary: { truth_epoch: null, truth_sequence: 5, latest_truth_hash: 'h', latest_entry_hash: 'e' },
        approval_anti_replay: { replay_protected: true, terminal_approval_enforced: true, expired_rejected: true },
        truth_ledger_lineage: { latest_truth_sequence: 5, latest_ledger_sequence: 5, drift_detected: false },
        checkpoint_recovery: { pass: true, latest_checkpoint_sequence: 5, missing_lineage_count: 0 },
        effects: { recent_count: 1, callback_reconciled: true },
        governance: { runtime_roles: ['org_admin'], policy_count: 2, rbac_enforced: true },
        billing_operational_value: { executions_this_period: 3, usage_events: 3, billed_estimate_usd: 1.25 },
        source: { public_narrative_available: true, verified_runtime_available: true, generated_from: 'runtime_tables' },
        gaps: [],
      })),
      summarizeVerifiedRuntimeReport: vi.fn(() => ({
        report_class: 'verified_runtime_summary',
        mode: 'verified_runtime',
        org_id: 'o1',
        agent_id: 'a1',
        generated_at: '2026-03-31T00:00:00.000Z',
        final_verdict: 'verified',
        drift_detected: false,
        replay_protected: true,
        checkpoint_pass: true,
        rbac_enforced: true,
        gaps: [],
      })),
    }));

    const { default: VerifiedReportPage } = await import('../../../app/enterprise-proof/verified/report/page');
    const node = await VerifiedReportPage({ searchParams: { org_id: 'o1', agent_id: 'a1' } });
    const html = renderToStaticMarkup(node);

    expect(html).toContain('Verified Runtime Evidence');
    expect(html).toContain('Runtime Summary');
    expect(html).toContain('Anti-Replay Proof');
    expect(html).toContain('Final Verdict');
  });
});
