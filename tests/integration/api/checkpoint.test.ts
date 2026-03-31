import { vi } from 'vitest';

describe('/api/checkpoint', () => {
  it('returns 403 when role is missing', async () => {
    vi.resetModules();
    vi.doMock('../../../lib/authz', () => ({ requireOrgRole: vi.fn(async () => ({ ok: false, status: 403, error: 'Insufficient role' })) }));
    const { POST } = await import('../../../app/api/checkpoint/route');
    const req = new Request('http://localhost/api/checkpoint', { method: 'POST', body: JSON.stringify({}) });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
