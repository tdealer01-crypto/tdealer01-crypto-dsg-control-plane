import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('jit role mapping', () => {
  beforeEach(() => vi.resetModules());

  it('does not override owner role', async () => {
    const update = vi.fn(() => ({ eq: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) }));
    vi.doMock('../../lib/supabase-server', () => ({ getSupabaseAdmin: () => ({ from: () => ({ update }) }) }));
    const { applyDirectoryRoleMapping } = await import('../../lib/auth/jit-provisioning');
    const res = await applyDirectoryRoleMapping({ orgId: 'o1', userId: 'u1', currentRole: 'owner', mappedRole: 'viewer' });
    expect(res.updated).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
});
