import { describe, it, expect, vi } from 'vitest';

describe('access policy domain precedence', () => {
  it('DB-backed domain rules override env fallback', async () => {
    process.env.APPROVED_AUTO_JOIN_DOMAINS = 'example.com';
    vi.doMock('../../../lib/auth/domain-governance', () => ({ resolveDomainGovernance: vi.fn(async () => ({ source: 'db', auto_join_mode: 'require_approval', status: 'verified', claim_mode: 'automatic' })) }));
    const { resolveAccessPolicyForEmail } = await import('../../../lib/auth/access-policy');
    const result = await resolveAccessPolicyForEmail('user@example.com', 'org-1');
    expect(result.mode).toBe('require_approval');
    expect(result.source).toBe('db');
  });
});
