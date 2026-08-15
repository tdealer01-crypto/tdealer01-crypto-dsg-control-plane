import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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

describe('workflows that resolve Vercel routing', () => {
  const workflowDir = join(process.cwd(), '.github', 'workflows');

  // Under activeAccount: "new", resolveVercelRouting reads the destination IDs
  // from NEW_VERCEL_ORG_ID / NEW_VERCEL_PROJECT_ID and throws when either is
  // absent. A workflow that only forwards the token therefore fails at the
  // routing step, which is how the migration to the rebuilt Vercel project
  // silently broke production-readiness, promoted-production-deploy, and
  // set-stripe-price-env. This pins the full trio for every caller.
  const routingSteps = readdirSync(workflowDir)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .flatMap((name) => {
      const content = readFileSync(join(workflowDir, name), 'utf8');
      // Split on step boundaries so each block carries its own env: keys.
      // `node --check <path>` is a syntax check, not an invocation, and does
      // not match this exact command string.
      return content
        .split(/\n(?=\s*- )/)
        .filter((step) => step.includes('node scripts/resolve-vercel-routing.mjs'))
        .map((step) => ({ workflow: name, step }));
    });

  it('finds every workflow step that invokes the routing resolver', () => {
    expect(routingSteps.length).toBeGreaterThan(0);
  });

  it.each(['NEW_VERCEL_ORG_ID', 'NEW_VERCEL_PROJECT_ID', 'NEW_VERCEL_TOKEN', 'LEGACY_VERCEL_TOKEN'])(
    'forwards %s in every routing step',
    (variable) => {
      const missing = routingSteps
        .filter(({ step }) => !step.includes(`${variable}:`))
        .map(({ workflow }) => workflow);

      expect(missing).toEqual([]);
    },
  );
});
