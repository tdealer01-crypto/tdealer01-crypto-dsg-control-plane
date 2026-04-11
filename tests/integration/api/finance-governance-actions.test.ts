import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('finance governance action routes', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('submits a finance workflow item', async () => {
    const { POST } = await import('../../../app/api/finance-governance/submit/route');

    const request = new Request('http://localhost/api/finance-governance/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: 'case-001' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.action).toBe('submit');
    expect(body.caseId).toBe('case-001');
    expect(body.nextStatus).toBe('pending');
  });

  it('approves an approval item', async () => {
    const { POST } = await import('../../../app/api/finance-governance/approvals/[id]/approve/route');

    const request = new Request('http://localhost/api/finance-governance/approvals/APR-1001/approve', {
      method: 'POST',
    });

    const response = await POST(request, { params: { id: 'APR-1001' } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.action).toBe('approve');
    expect(body.approvalId).toBe('APR-1001');
    expect(body.nextStatus).toBe('approved');
  });

  it('rejects an approval item', async () => {
    const { POST } = await import('../../../app/api/finance-governance/approvals/[id]/reject/route');

    const request = new Request('http://localhost/api/finance-governance/approvals/APR-1002/reject', {
      method: 'POST',
    });

    const response = await POST(request, { params: { id: 'APR-1002' } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.action).toBe('reject');
    expect(body.approvalId).toBe('APR-1002');
    expect(body.nextStatus).toBe('rejected');
  });

  it('escalates an approval item', async () => {
    const { POST } = await import('../../../app/api/finance-governance/approvals/[id]/escalate/route');

    const request = new Request('http://localhost/api/finance-governance/approvals/APR-1003/escalate', {
      method: 'POST',
    });

    const response = await POST(request, { params: { id: 'APR-1003' } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.action).toBe('escalate');
    expect(body.approvalId).toBe('APR-1003');
    expect(body.nextStatus).toBe('escalated');
  });
});
