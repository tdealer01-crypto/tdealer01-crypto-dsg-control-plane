import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('finance governance api routes', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns workspace summary data', async () => {
    const { GET } = await import('../../../app/api/finance-governance/workspace/summary/route');

    const response = await GET();
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

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.approvals).toHaveLength(3);
    expect(body.approvals[0].id).toBe('APR-1001');
  });

  it('returns case detail data for requested id', async () => {
    const { GET } = await import('../../../app/api/finance-governance/cases/[id]/route');

    const request = new Request('http://localhost/api/finance-governance/cases/sample-case');
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
