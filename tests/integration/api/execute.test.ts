import { vi } from 'vitest';

describe('/api/execute', () => {
  it('returns 401 when authz denies request', async () => {
    vi.resetModules();
    vi.doMock('../../../lib/authz', () => ({ requireOrgRole: vi.fn(async () => ({ ok: false, status: 401, error: 'Unauthorized' })) }));
    const { POST } = await import('../../../app/api/execute/route');
    const req = new Request('http://localhost/api/execute', { method: 'POST', body: JSON.stringify({ agent_id: 'a' }) });
    const res = await POST(req);
    expect(res.status).toBe(401);
  }, 15_000);
});
