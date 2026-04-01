import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('/api/settings/security/sign-ins', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('requires org.manage_security', async () => {
    vi.doMock('../../../../lib/auth/require-org-permission', () => ({
      requireOrgPermission: vi.fn(async () => ({ ok: false, status: 403, error: 'Insufficient permission' })),
    }));

    const { GET } = await import('../../../../app/api/settings/security/sign-ins/route');
    const res = await GET();
    expect(res.status).toBe(403);
  });
});
