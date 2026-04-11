import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('finance governance server store routes', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns server store snapshot', async () => {
    const { GET } = await import('../../../app/api/finance-governance/server-store/state/route');

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.workspace.workspace).toBe('Finance Governance Workspace');
    expect(Array.isArray(body.approvals)).toBe(true);
  });

  it('submits into server store and returns updated snapshot', async () => {
    const { POST } = await import('../../../app/api/finance-governance/server-store/submit/route');

    const request = new Request('http://localhost/api/finance-governance/server-store/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId: 'server-case-001' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.action).toBe('submit');
    expect(body.snapshot.workspace.counts.readyExports).toBeGreaterThanOrEqual(1);
  });

  it('applies approve action in server store', async () => {
    const { POST } = await import('../../../app/api/finance-governance/server-store/approvals/[id]/approve/route');

    const request = new Request('http://localhost/api/finance-governance/server-store/approvals/APR-1001/approve', {
      method: 'POST',
    });

    const response = await POST(request, { params: { id: 'APR-1001' } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.action).toBe('approve');
    expect(body.snapshot.approvals.find((item: { id: string }) => item.id === 'APR-1001')?.status).toBe('approved');
  });

  it('applies reject action in server store', async () => {
    const { POST } = await import('../../../app/api/finance-governance/server-store/approvals/[id]/reject/route');

    const request = new Request('http://localhost/api/finance-governance/server-store/approvals/APR-1002/reject', {
      method: 'POST',
    });

    const response = await POST(request, { params: { id: 'APR-1002' } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.action).toBe('reject');
    expect(body.snapshot.approvals.find((item: { id: string }) => item.id === 'APR-1002')?.status).toBe('rejected');
  });

  it('applies escalate action in server store', async () => {
    const { POST } = await import('../../../app/api/finance-governance/server-store/approvals/[id]/escalate/route');

    const request = new Request('http://localhost/api/finance-governance/server-store/approvals/APR-1003/escalate', {
      method: 'POST',
    });

    const response = await POST(request, { params: { id: 'APR-1003' } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.action).toBe('escalate');
    expect(body.snapshot.approvals.find((item: { id: string }) => item.id === 'APR-1003')?.status).toBe('escalated');
  });

  it('resets server store state', async () => {
    const { POST } = await import('../../../app/api/finance-governance/server-store/reset/route');

    const request = new Request('http://localhost/api/finance-governance/server-store/reset', {
      method: 'POST',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.workspace.workspace).toBe('Finance Governance Workspace');
    expect(body.workspace.counts.readyExports).toBe(0);
  });
});
