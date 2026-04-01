import { describe, it, expect } from 'vitest';
import { preventRemovingLastOwner, preventDisablingAllRecoveryPaths } from '../../../lib/auth/admin-safety';

function adminMock(ownerCount = 1, security: any = { sso_enabled: false, sso_metadata: {}, break_glass_email_enabled: false }) {
  return { from: (table: string) => ({ select: () => ({ eq: () => ({ eq: () => ({ eq: async () => ({ data: table === 'users' ? Array.from({ length: ownerCount }).map((_, i) => ({ id: i === 0 ? 'u1' : `u${i + 1}` })) : [], error: null }), maybeSingle: async () => ({ data: security, error: null }) }), maybeSingle: async () => ({ data: security, error: null }) }) }) }) } as any;
}

describe('admin safety', () => {
  it('blocks removing last owner', async () => { await expect(preventRemovingLastOwner(adminMock(1), 'org1', 'u1', 'member')).rejects.toThrow(/last owner/i); });
  it('blocks unsafe sso enforcement', async () => { await expect(preventDisablingAllRecoveryPaths(adminMock(2, { sso_enabled: false, sso_metadata: {}, break_glass_email_enabled: false }), 'org1')).rejects.toThrow(/Cannot enforce SSO yet/i); });
});
