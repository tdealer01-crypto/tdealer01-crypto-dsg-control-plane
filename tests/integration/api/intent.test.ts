import { vi } from 'vitest';

describe('/api/intent', () => {
  it('returns 401 when authz denies request', async () => {
    vi.resetModules();
    vi.doMock('../../../lib/authz', () => ({ requireOrgRole: vi.fn(async () => ({ ok: false, status: 401, error: 'Unauthorized' })) }));
    const { POST } = await import('../../../app/api/intent/route');
    const req = new Request('http://localhost/api/intent', { method: 'POST', body: JSON.stringify({}) });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
