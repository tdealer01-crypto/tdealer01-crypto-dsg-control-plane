import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getWorkspaceSummary, getApprovals, getCaseDetail, getOrg, onboardingMaybeSingle } = vi.hoisted(() => ({
  getWorkspaceSummary: vi.fn(),
  getApprovals: vi.fn(),
  getCaseDetail: vi.fn(),
  getOrg: vi.fn(),
  onboardingMaybeSingle: vi.fn(),
}));

vi.mock('../../../lib/finance-governance/repository', () => ({
  FinanceGovernanceRepository: vi.fn().mockImplementation(() => ({
    getWorkspaceSummary,
    getApprovals,
    getCaseDetail,
  })),
}));

vi.mock('../../../lib/server/getOrg', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/server/getOrg')>();
  return {
    ...actual,
    getOrg,
  };
});

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: onboardingMaybeSingle,
        }),
      }),
    }),
  }),
}));

describe('finance governance api routes', () => {
  beforeEach(() => {
    vi.resetModules();
    getWorkspaceSummary.mockReset();
    getApprovals.mockReset();
    getCaseDetail.mockReset();
    getOrg.mockReset();
    onboardingMaybeSingle.mockReset();
    getOrg.mockResolvedValue('org-test');
    onboardingMaybeSingle.mockResolvedValue({
      data: {
        bootstrap_status: 'in_progress',
        checklist: {
          steps: [
            { id: 'workspace', label: 'Workspace', status: 'in_progress' },
            { id: 'policy', label: 'Policy', status: 'todo' },
            { id: 'agent', label: 'Agent', status: 'todo' },
            { id: 'execution', label: 'Execution', status: 'todo' },
            { id: 'audit', label: 'Audit', status: 'todo' },
          ],
          next_action: 'complete_audit',
        },
        bootstrapped_at: null,
      },
      error: null,
    });
    getWorkspaceSummary.mockResolvedValue({ counts: { pendingApprovals: 12 }, quickLinks: [{}, {}, {}] });
    getApprovals.mockResolvedValue([{ id: 'APR-1001' }, { id: 'APR-1002' }, { id: 'APR-1003' }]);
    getCaseDetail.mockResolvedValue({ id: 'sample-case', timeline: ['a', 'b', 'c', 'd', 'e'], transaction: { workflow: 'Invoice approval governance' } });
  });

  it('returns workspace summary data', async () => {
    const { GET } = await import('../../../app/api/finance-governance/workspace/summary/route');

    const response = await GET(new Request('http://localhost/api/finance-governance/workspace/summary', { headers: { 'x-org-id': 'org-test' } }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.workspace.counts.pendingApprovals).toBe(12);
    expect(body.workspace.quickLinks).toHaveLength(3);
  });

  it('returns onboarding steps', async () => {
    const { GET } = await import('../../../app/api/finance-governance/onboarding/route');

    const response = await GET(new Request('http://localhost/api/finance-governance/onboarding', { headers: { 'x-org-id': 'org-test' } }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.steps).toHaveLength(5);
    expect(body.steps[0].id).toBe('workspace');
  });

  it('rejects onboarding when x-org-id is missing', async () => {
    const { GET } = await import('../../../app/api/finance-governance/onboarding/route');
    getOrg.mockRejectedValueOnce(new Error('missing_org_id'));

    const response = await GET(new Request('http://localhost/api/finance-governance/onboarding', { headers: { 'x-org-id': '' } }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('missing_org_id');
  });

  it('returns approval queue items', async () => {
    const { GET } = await import('../../../app/api/finance-governance/approvals/route');

    const response = await GET(new Request('http://localhost/api/finance-governance/approvals', { headers: { 'x-org-id': 'org-test' } }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.approvals).toHaveLength(3);
    expect(body.approvals[0].id).toBe('APR-1001');
  });

  it('returns case detail data for requested id', async () => {
    const { GET } = await import('../../../app/api/finance-governance/cases/[id]/route');

    const request = new Request('http://localhost/api/finance-governance/cases/sample-case', { headers: { 'x-org-id': 'org-test' } });
    const response = await GET(request, {
      params: Promise.resolve({
        id: 'sample-case',
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.case.id).toBe('sample-case');
    expect(body.case.timeline).toHaveLength(5);
    expect(body.case.transaction.workflow).toBe('Invoice approval governance');
  });
});
