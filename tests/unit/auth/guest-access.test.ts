import { describe, expect, it } from 'vitest';
import { canGuestAccessResource, isGuestGrantExpired } from '../../../lib/auth/guest-access';

describe('guest access helpers', () => {
  it('detects expiry based on expires_at', () => {
    expect(isGuestGrantExpired({ expires_at: null })).toBe(false);
    expect(isGuestGrantExpired({ expires_at: new Date(Date.now() - 60_000).toISOString() })).toBe(true);
    expect(isGuestGrantExpired({ expires_at: new Date(Date.now() + 60_000).toISOString() })).toBe(false);
  });

  it('enforces read-only guest scope', () => {
    const grant = {
      scope: { reports: true, evidence: true, executions: ['x'] },
      status: 'active' as const,
      expires_at: null,
    };

    expect(canGuestAccessResource(grant, 'reports')).toBe(true);
    expect(canGuestAccessResource(grant, 'evidence')).toBe(true);
    expect(canGuestAccessResource(grant, 'executions')).toBe(false);
  });
});
