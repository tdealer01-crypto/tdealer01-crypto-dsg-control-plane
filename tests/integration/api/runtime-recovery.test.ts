import { vi } from 'vitest';

describe('/api/runtime-recovery', () => {
  it('enforces org role when demo bypass is disabled', async () => {
    vi.resetModules();
    vi.doMock('../../../lib/authz', () => ({ requireOrgRole: vi.fn(async () => ({ ok: false, status: 403, error: 'Insufficient role' })) }));
    const { POST } = await import('../../../app/api/runtime-recovery/route');
    const req = new Request('http://localhost/api/runtime-recovery', { method: 'POST', body: JSON.stringify({ org_id: 'o1', agent_id: 'a1' }) });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
