import { describe, expect, it } from 'vitest';

// @ts-expect-error The production helper is intentionally a native ESM module.
import { resolveVercelRouting } from '../../../scripts/resolve-vercel-routing.mjs';

const legacy = {
  teamId: 'team_n189mlAdVHR6cGGiaAwsKzQ0',
  projectId: 'prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW',
  projectName: 'tdealer01-crypto-dsg-control-plane',
};

describe('Vercel routing configuration', () => {
  it('keeps legacy routing active until a verified config commit switches it', () => {
    const result = resolveVercelRouting({
      config: {
        schemaVersion: 1,
        activeAccount: 'legacy',
        accounts: {
          legacy,
          new: {
            teamId: '',
            projectId: '',
            projectName: 'tdealer01-crypto-dsg-control-plane',
          },
        },
      },
      legacyToken: 'legacy-token',
      newToken: '',
    });

    expect(result).toEqual({
      accountMode: 'legacy',
      useNewAccount: false,
      teamId: legacy.teamId,
      projectId: legacy.projectId,
      projectName: legacy.projectName,
      token: 'legacy-token',
    });
  });

  it('selects only a distinct, fully configured new account', () => {
    const result = resolveVercelRouting({
      config: {
        schemaVersion: 1,
        activeAccount: 'new',
        accounts: {
          legacy,
          new: {
            teamId: 'team_newAccount123',
            projectId: 'prj_newProject123',
            projectName: 'tdealer01-crypto-dsg-control-plane',
          },
        },
      },
      legacyToken: 'legacy-token',
      newToken: 'new-token',
    });

    expect(result.accountMode).toBe('new');
    expect(result.useNewAccount).toBe(true);
    expect(result.teamId).toBe('team_newAccount123');
    expect(result.projectId).toBe('prj_newProject123');
    expect(result.token).toBe('new-token');
  });

  it('blocks new routing when IDs or credentials are incomplete', () => {
    expect(() =>
      resolveVercelRouting({
        config: {
          schemaVersion: 1,
          activeAccount: 'new',
          accounts: {
            legacy,
            new: {
              teamId: '',
              projectId: '',
              projectName: 'tdealer01-crypto-dsg-control-plane',
            },
          },
        },
        legacyToken: 'legacy-token',
        newToken: '',
      }),
    ).toThrow('new Vercel team ID is invalid');
  });
});
