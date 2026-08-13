import { describe, expect, it, vi } from 'vitest';

// @ts-expect-error The production helper is intentionally a native ESM module.
import {
  classifyEnvironmentVariables,
  environmentIdentity,
  prepareMigrationPlan,
  runVercelEnvMigration,
  verifyEnvironmentParity,
} from '../../../scripts/lib/vercel-env-sync.mjs';

describe('Vercel ENV migration', () => {
  it('excludes system, integration-managed, and custom-environment values by default', () => {
    const result = classifyEnvironmentVariables([
      { key: 'VERCEL_URL', type: 'system' },
      { key: 'GITHUB_TOKEN', type: 'encrypted' },
      {
        key: 'POSTGRES_URL',
        type: 'encrypted',
        contentHint: { type: 'postgres-url', storeId: 'store_1' },
      },
      {
        key: 'CUSTOM_ONLY',
        type: 'plain',
        customEnvironmentIds: ['env_custom_1'],
      },
      { key: 'APP_URL', type: 'plain', target: ['production'], value: 'example' },
    ]);

    expect(result.candidates.map((entry: { key: string }) => entry.key)).toEqual(['APP_URL']);
    expect(result.excluded).toEqual({
      system: ['GITHUB_TOKEN', 'VERCEL_URL'],
      integrationManaged: ['POSTGRES_URL'],
      customEnvironment: ['CUSTOM_ONLY'],
    });
  });

  it('preserves target, branch, and type with deterministic ordering', async () => {
    const sourceClient = {
      getEnvironmentVariable: vi.fn().mockResolvedValue({
        type: 'encrypted',
        value: 'resolved-value',
        decrypted: true,
      }),
    };

    const result = await prepareMigrationPlan({
      records: [
        {
          id: 'env_b',
          key: 'B_KEY',
          type: 'encrypted',
          target: ['production'],
          decrypted: false,
        },
        {
          id: 'env_a_preview',
          key: 'A_KEY',
          type: 'plain',
          target: ['production', 'development', 'preview'],
          gitBranch: 'release/test',
          value: 'plain-value',
        },
        {
          id: 'env_a_prod',
          key: 'A_KEY',
          type: 'plain',
          target: ['production'],
          value: 'production-value',
        },
      ],
      sourceClient,
      sourceProjectId: 'prj_source',
    });

    expect(result.entries).toEqual([
      {
        key: 'A_KEY',
        value: 'plain-value',
        type: 'plain',
        target: ['development', 'preview', 'production'],
        gitBranch: 'release/test',
      },
      {
        key: 'A_KEY',
        value: 'production-value',
        type: 'plain',
        target: ['production'],
      },
      {
        key: 'B_KEY',
        value: 'resolved-value',
        type: 'encrypted',
        target: ['production'],
      },
    ]);
    expect(sourceClient.getEnvironmentVariable).toHaveBeenCalledOnce();
  });

  it('blocks protected values before any destination mutation', async () => {
    const sourceClient = {
      listEnvironmentVariables: vi.fn().mockResolvedValue({
        envs: [
          {
            id: 'env_sensitive',
            key: 'PAYMENT_SECRET',
            type: 'sensitive',
            target: ['production'],
            decrypted: false,
          },
        ],
        hiddenProductionEnvCount: 0,
      }),
      getEnvironmentVariable: vi.fn(),
    };
    const destinationClient = {
      getProject: vi.fn(),
      createProject: vi.fn(),
      listEnvironmentVariables: vi.fn(),
      upsertEnvironmentVariables: vi.fn(),
    };

    await expect(
      runVercelEnvMigration({
        sourceClient,
        sourceProjectId: 'prj_source',
        destinationClient,
        destinationProjectName: 'dsg-control-plane',
        dryRun: false,
      }),
    ).rejects.toThrow('PAYMENT_SECRET');

    expect(destinationClient.getProject).not.toHaveBeenCalled();
    expect(destinationClient.upsertEnvironmentVariables).not.toHaveBeenCalled();
  });

  it('blocks with a reachable source-token remedy when production metadata is hidden', async () => {
    const destinationClient = { getProject: vi.fn(), upsertEnvironmentVariables: vi.fn() };
    await expect(
      runVercelEnvMigration({
        sourceClient: {
          listEnvironmentVariables: vi.fn().mockResolvedValue({
            envs: [],
            hiddenProductionEnvCount: 2,
          }),
        },
        sourceProjectId: 'prj_source',
        destinationClient,
        destinationProjectName: 'dsg-control-plane',
        dryRun: false,
      }),
    ).rejects.toThrow('source token cannot enumerate 2 protected production ENV metadata record(s)');
    expect(destinationClient.getProject).not.toHaveBeenCalled();
    expect(destinationClient.upsertEnvironmentVariables).not.toHaveBeenCalled();
  });

  it('blocks activation until every excluded integration is reconnected in the destination', async () => {
    const sourceClient = {
      listEnvironmentVariables: vi.fn().mockResolvedValue({
        envs: [
          {
            id: 'env_stripe',
            key: 'STRIPE_SECRET_KEY',
            type: 'encrypted',
            target: ['production', 'preview'],
            contentHint: { integrationConfigurationId: 'icfg_source' },
          },
        ],
        hiddenProductionEnvCount: 0,
      }),
      getEnvironmentVariable: vi.fn(),
    };
    const destinationClient = {
      getProject: vi.fn().mockResolvedValue({
        id: 'prj_destination',
        accountId: 'team_destination',
        name: 'dsg-control-plane',
      }),
      listEnvironmentVariables: vi.fn().mockResolvedValue({ envs: [] }),
      upsertEnvironmentVariables: vi.fn(),
    };

    await expect(
      runVercelEnvMigration({
        sourceClient,
        sourceProjectId: 'prj_source',
        destinationClient,
        destinationProjectName: 'dsg-control-plane',
        dryRun: false,
      }),
    ).rejects.toThrow('Reconnected integration ENV verification failed');

    expect(destinationClient.upsertEnvironmentVariables).not.toHaveBeenCalled();
  });

  it('verifies reconnected integration key, scope, type, and managed metadata', async () => {
    const sourceClient = {
      listEnvironmentVariables: vi.fn().mockResolvedValue({
        envs: [
          {
            id: 'env_stripe',
            key: 'STRIPE_SECRET_KEY',
            type: 'encrypted',
            target: ['preview', 'production'],
            contentHint: { integrationConfigurationId: 'icfg_source' },
          },
        ],
        hiddenProductionEnvCount: 0,
      }),
      getEnvironmentVariable: vi.fn(),
    };
    const destinationClient = {
      getProject: vi.fn().mockResolvedValue({
        id: 'prj_destination',
        accountId: 'team_destination',
        name: 'dsg-control-plane',
      }),
      listEnvironmentVariables: vi.fn().mockResolvedValue({
        envs: [
          {
            id: 'env_stripe_destination',
            key: 'STRIPE_SECRET_KEY',
            type: 'encrypted',
            target: ['production', 'preview'],
            contentHint: { integrationConfigurationId: 'icfg_destination' },
          },
        ],
      }),
    };

    const result = await runVercelEnvMigration({
      sourceClient,
      sourceProjectId: 'prj_source',
      destinationClient,
      destinationProjectName: 'dsg-control-plane',
      dryRun: true,
    });

    expect(result.status).toBe('dry_run');
    expect(result.copyCount).toBe(0);
    expect(result.integrationVerifiedCount).toBe(1);
  });

  it('accepts protected values only after sensitive destination metadata is verified', async () => {
    const sourceClient = {
      listEnvironmentVariables: vi.fn().mockResolvedValue({
        envs: [
          {
            id: 'env_sensitive',
            key: 'PAYMENT_SECRET',
            type: 'sensitive',
            target: ['production'],
            decrypted: false,
          },
        ],
        hiddenProductionEnvCount: 0,
      }),
      getEnvironmentVariable: vi.fn(),
    };
    const destinationClient = {
      getProject: vi.fn().mockResolvedValue({
        id: 'prj_destination',
        accountId: 'team_destination',
        name: 'dsg-control-plane',
      }),
      listEnvironmentVariables: vi.fn().mockResolvedValue({
        envs: [
          {
            id: 'env_rotated',
            key: 'PAYMENT_SECRET',
            type: 'sensitive',
            target: ['production'],
          },
        ],
      }),
    };

    const result = await runVercelEnvMigration({
      sourceClient,
      sourceProjectId: 'prj_source',
      destinationClient,
      destinationProjectName: 'dsg-control-plane',
      acknowledgeRotatedProtected: true,
      dryRun: true,
    });

    expect(result.status).toBe('dry_run');
    expect(result.copyCount).toBe(0);
    expect(result.excluded.protectedRotated).toEqual(['PAYMENT_SECRET']);
    expect(sourceClient.getEnvironmentVariable).not.toHaveBeenCalled();
  });

  it('upserts and reads back decryptable values before reporting verified', async () => {
    const sourceClient = {
      listEnvironmentVariables: vi.fn().mockResolvedValue({
        envs: [
          {
            id: 'env_app_url',
            key: 'APP_URL',
            type: 'plain',
            target: ['production'],
            value: 'https://example.test',
          },
          {
            id: 'env_api_token',
            key: 'API_TOKEN',
            type: 'encrypted',
            target: ['preview', 'production'],
            value: 'encrypted-value',
            decrypted: true,
          },
        ],
        hiddenProductionEnvCount: 0,
      }),
      getEnvironmentVariable: vi.fn(),
    };
    const destinationClient = {
      getProject: vi.fn().mockResolvedValue({
        id: 'prj_destination',
        accountId: 'team_destination',
        name: 'dsg-control-plane',
      }),
      createProject: vi.fn(),
      listEnvironmentVariables: vi
        .fn()
        .mockResolvedValueOnce({ envs: [] })
        .mockResolvedValueOnce({
          envs: [
            {
              id: 'env_destination_app_url',
              key: 'APP_URL',
              type: 'plain',
              target: ['production'],
              value: 'https://example.test',
            },
            {
              id: 'env_destination_api_token',
              key: 'API_TOKEN',
              type: 'encrypted',
              target: ['production', 'preview'],
              value: 'encrypted-value',
              decrypted: true,
            },
          ],
        }),
      getEnvironmentVariable: vi.fn(),
      upsertEnvironmentVariables: vi.fn().mockResolvedValue({ created: [] }),
    };

    const result = await runVercelEnvMigration({
      sourceClient,
      sourceProjectId: 'prj_source',
      destinationClient,
      destinationProjectName: 'dsg-control-plane',
      dryRun: false,
    });

    expect(result.status).toBe('verified');
    expect(result.copyCount).toBe(2);
    expect(destinationClient.upsertEnvironmentVariables).toHaveBeenCalledOnce();
    expect(destinationClient.createProject).not.toHaveBeenCalled();
  });

  it('reports parity failures by key without exposing either value', () => {
    const source = [
      {
        key: 'API_TOKEN',
        type: 'encrypted',
        target: ['preview', 'production'],
        value: 'source-value',
      },
      {
        key: 'APP_URL',
        type: 'plain',
        target: ['production'],
        value: 'https://example.test',
      },
    ];
    const destination = [
      {
        key: 'API_TOKEN',
        type: 'encrypted',
        target: ['production', 'preview'],
        value: 'different-value',
      },
    ];

    expect(environmentIdentity(source[0])).toBe(environmentIdentity(destination[0]));
    expect(verifyEnvironmentParity(source, destination)).toEqual({
      ok: false,
      missing: ['APP_URL'],
      unreadable: [],
      mismatched: ['API_TOKEN'],
    });
  });
});
