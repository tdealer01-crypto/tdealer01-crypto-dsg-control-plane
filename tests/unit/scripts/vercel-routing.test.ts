import { describe, expect, it } from 'vitest';

// @ts-expect-error The production helper is intentionally a native ESM module.
import { resolveVercelRouting } from '../../../scripts/resolve-vercel-routing.mjs';

const legacy = {
  teamId: 'team_n189mlAdVHR6cGGiaAwsKzQ0',
  projectId: 'prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW',
  projectName: 'tdealer01-crypto-dsg-control-plane',
};

const blankNew = {
  teamId: '',
  projectId: '',
  projectName: 'tdealer01-crypto-dsg-control-plane',
};

describe('Vercel routing configuration', () => {
  it('keeps legacy routing available as the rollback identity', () => {
    const result = resolveVercelRouting({
      config: {
        schemaVersion: 1,
        activeAccount: 'legacy',
        accounts: { legacy, new: blankNew },
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

  it('routes to a distinct new account using protected secret IDs', () => {
    const result = resolveVercelRouting({
      config: {
        schemaVersion: 1,
        activeAccount: 'new',
        accounts: { legacy, new: blankNew },
      },
      legacyToken: 'legacy-token',
      newToken: 'new-token',
      newTeamId: 'team_newAccount123',
      newProjectId: 'prj_newProject123',
    });

    expect(result.accountMode).toBe('new');
    expect(result.useNewAccount).toBe(true);
    expect(result.teamId).toBe('team_newAccount123');
    expect(result.projectId).toBe('prj_newProject123');
    expect(result.token).toBe('new-token');
  });

  it('blocks new routing when protected IDs or credentials are incomplete', () => {
    expect(() =>
      resolveVercelRouting({
        config: {
          schemaVersion: 1,
          activeAccount: 'new',
          accounts: { legacy, new: blankNew },
        },
        legacyToken: 'legacy-token',
        newToken: '',
        newTeamId: '',
        newProjectId: '',
      }),
    ).toThrow('VERCEL_ORG_ID_NEW is missing or invalid');
  });

  it('blocks accidental reuse of the legacy destination under new routing', () => {
    expect(() =>
      resolveVercelRouting({
        config: {
          schemaVersion: 1,
          activeAccount: 'new',
          accounts: { legacy, new: blankNew },
        },
        legacyToken: 'legacy-token',
        newToken: 'new-token',
        newTeamId: legacy.teamId,
        newProjectId: 'prj_newProject123',
      }),
    ).toThrow('New-account routing resolves to the legacy account');
  });
});
