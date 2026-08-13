import { describe, expect, it } from 'vitest';

// @ts-expect-error The production helper is intentionally a native ESM module.
import { resolveMigrationRequest } from '../../../scripts/resolve-vercel-env-migration-request.mjs';

const sha = 'a'.repeat(40);

describe('Vercel migration request', () => {
  it('binds an agent request file to the exact pushed main commit', () => {
    const result = resolveMigrationRequest({
      eventName: 'push',
      githubSha: sha,
      fileRequest: {
        schemaVersion: 1,
        requestId: 'dry-run-20260813',
        newTeamId: '',
        newProjectId: '',
        newProjectName: 'dsg-control-plane',
        dryRun: true,
        includeIntegrationManaged: false,
        acknowledgeRotatedProtected: false,
        deployPreview: true,
      },
    });

    expect(result.expectedMainSha).toBe(sha);
    expect(result.dryRun).toBe(true);
  });

  it('preserves exact manual-dispatch authorization', () => {
    const result = resolveMigrationRequest({
      eventName: 'workflow_dispatch',
      githubSha: sha,
      dispatch: {
        expectedMainSha: sha,
        newTeamId: 'team_destination',
        newProjectId: 'prj_destination',
        newProjectName: 'dsg-control-plane',
        dryRun: 'false',
        includeIntegrationManaged: 'false',
        acknowledgeRotatedProtected: 'true',
        deployPreview: 'true',
      },
    });

    expect(result.expectedMainSha).toBe(sha);
    expect(result.dryRun).toBe(false);
    expect(result.acknowledgeRotatedProtected).toBe(true);
  });

  it('blocks a live request that disables preview verification', () => {
    expect(() =>
      resolveMigrationRequest({
        eventName: 'push',
        githubSha: sha,
        fileRequest: {
          schemaVersion: 1,
          requestId: 'live-run-20260813',
          newTeamId: '',
          newProjectId: '',
          newProjectName: 'dsg-control-plane',
          dryRun: false,
          includeIntegrationManaged: false,
          acknowledgeRotatedProtected: false,
          deployPreview: false,
        },
      }),
    ).toThrow('requires preview deployment');
  });
});
