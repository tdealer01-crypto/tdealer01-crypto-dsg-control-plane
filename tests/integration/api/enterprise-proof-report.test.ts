import { vi } from 'vitest';

describe('/api/enterprise-proof/report', () => {
  it('returns 401 when authz denies request', async () => {
    vi.resetModules();
    vi.doMock('../../../lib/authz', () => ({ requireOrgRole: vi.fn(async () => ({ ok: false, status: 401, error: 'Unauthorized' })) }));
    const { GET } = await import('../../../app/api/enterprise-proof/report/route');
    const req = new Request('http://localhost/api/enterprise-proof/report?org_id=o1&agent_id=a1');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
