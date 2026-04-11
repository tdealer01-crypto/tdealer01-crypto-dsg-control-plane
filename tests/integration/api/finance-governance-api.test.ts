import { beforeEach, describe, expect, it, vi } from 'vitest';

const getWorkspaceSummary = vi.fn();
const getApprovals = vi.fn();
const getCaseDetail = vi.fn();

vi.mock('../../../lib/finance-governance/repository', () => ({
  FinanceGovernanceRepository: vi.fn().mockImplementation(() => ({
    getWorkspaceSummary,
    getApprovals,
    getCaseDetail,
  })),
}));

describe('finance governance api routes', () => {
  beforeEach(() => {
    vi.resetModules();
    getWorkspaceSummary.mockReset();
    getApprovals.mockReset();
    getCaseDetail.mockReset();
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

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.steps).toHaveLength(5);
    expect(body.steps[0].id).toBe('workspace');
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
      params: {
        id: 'sample-case',
      },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.case.id).toBe('sample-case');
    expect(body.case.timeline).toHaveLength(5);
    expect(body.case.transaction.workflow).toBe('Invoice approval governance');
  });
});
