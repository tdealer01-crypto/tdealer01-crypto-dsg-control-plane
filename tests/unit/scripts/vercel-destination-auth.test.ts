import { describe, expect, it, vi } from 'vitest';

// @ts-expect-error The production helper is intentionally a native ESM module.
import { resolveDestinationAuthorization } from '../../../scripts/lib/vercel-destination-auth.mjs';

const legacyTeamId = 'team_legacy123';

describe('resolveDestinationAuthorization', () => {
  it('prefers a dedicated new-account token without probing the legacy token', async () => {
    const teamLoader = vi.fn();
    await expect(resolveDestinationAuthorization({
      legacyToken: 'legacy-token',
      configuredNewToken: 'new-token',
      requestedTeamId: 'team_new123',
      legacyTeamId,
      teamLoader,
    })).resolves.toEqual({
      token: 'new-token',
      teamId: 'team_new123',
      mode: 'dedicated-new-token',
    });
    expect(teamLoader).not.toHaveBeenCalled();
  });

  it('reuses the existing token only when exactly one distinct team is authorized', async () => {
    const teamLoader = vi.fn().mockResolvedValue([
      { id: legacyTeamId, name: 'Legacy' },
      { id: 'team_new123', name: 'New' },
    ]);
    await expect(resolveDestinationAuthorization({
      legacyToken: 'legacy-token',
      legacyTeamId,
      teamLoader,
    })).resolves.toEqual({
      token: 'legacy-token',
      teamId: 'team_new123',
      mode: 'shared-authorized-token',
    });
  });

  it('blocks fallback when no distinct destination team is authorized', async () => {
    await expect(resolveDestinationAuthorization({
      legacyToken: 'legacy-token',
      legacyTeamId,
      teamLoader: vi.fn().mockResolvedValue([{ id: legacyTeamId, name: 'Legacy' }]),
    })).rejects.toThrow('authorizes no non-legacy Vercel team');
  });

  it('requires an explicit team when the existing token reaches multiple destinations', async () => {
    await expect(resolveDestinationAuthorization({
      legacyToken: 'legacy-token',
      legacyTeamId,
      teamLoader: vi.fn().mockResolvedValue([
        { id: legacyTeamId, name: 'Legacy' },
        { id: 'team_new123', name: 'New A' },
        { id: 'team_new456', name: 'New B' },
      ]),
    })).rejects.toThrow('set newTeamId to one of: team_new123, team_new456');
  });
});
