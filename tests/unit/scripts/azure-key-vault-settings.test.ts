import { describe, expect, it } from 'vitest';
import {
  keyVaultSecretName,
  renderAzureKeyVaultSettings,
} from '../../../scripts/render-azure-key-vault-settings.mjs';

const CONTRACT = {
  schemaVersion: 'dsg.azure-runtime-env.v1',
  target: 'test-app',
  profiles: { core: 0, governed: 1 },
  neverSync: [{ name: 'CI_ONLY_TOKEN', reason: 'CI only' }],
  settings: [
    {
      name: 'APP_URL',
      source: 'variable',
      minimumProfile: 'core',
      required: true,
      phase: 'runtime',
      slotSetting: true,
      default: 'https://example.test',
    },
    {
      name: 'CORE_SECRET',
      source: 'secret',
      minimumProfile: 'core',
      required: true,
      phase: 'runtime',
      slotSetting: true,
    },
    {
      name: 'GOVERNED_SECRET',
      source: 'secret',
      minimumProfile: 'governed',
      required: true,
      phase: 'runtime',
      slotSetting: true,
    },
  ],
};

describe('Azure Key Vault runtime settings', () => {
  it('renders versionless references without requiring secret values in reference mode', () => {
    const rendered = renderAzureKeyVaultSettings(CONTRACT, 'core', 'dsg-test-vault', 'reference', {});
    expect(rendered.appSettings).toEqual([
      { name: 'APP_URL', value: 'https://example.test', slotSetting: true },
      {
        name: 'CORE_SECRET',
        value: '@Microsoft.KeyVault(VaultName=dsg-test-vault;SecretName=core-secret)',
        slotSetting: true,
      },
    ]);
    expect(rendered.vaultSecrets).toEqual([]);
  });

  it('requires and isolates secret values in seed mode while evidence remains names-only', () => {
    const rendered = renderAzureKeyVaultSettings(CONTRACT, 'core', 'dsg-test-vault', 'seed', {
      DSG_ENV_CORE_SECRET: 'never-print-this',
    });
    expect(rendered.vaultSecrets).toEqual([
      { appSettingName: 'CORE_SECRET', secretName: 'core-secret', value: 'never-print-this' },
    ]);
    expect(JSON.stringify(rendered.evidence)).not.toContain('never-print-this');
    expect(rendered.evidence.seededSecretNames).toEqual(['core-secret']);
  });

  it('fails closed when a required seed value is missing', () => {
    expect(() => renderAzureKeyVaultSettings(CONTRACT, 'core', 'dsg-test-vault', 'seed', {}))
      .toThrow('Missing required core settings for seed: CORE_SECRET');
  });

  it('rejects invalid vault names and modes', () => {
    expect(() => renderAzureKeyVaultSettings(CONTRACT, 'core', 'bad_vault', 'reference', {}))
      .toThrow('Azure Key Vault name must be 3-24 characters');
    expect(() => renderAzureKeyVaultSettings(CONTRACT, 'core', 'dsg-test-vault', 'copy', {}))
      .toThrow('Unknown secret mode: copy');
  });

  it('normalizes runtime ENV names to valid Key Vault secret names', () => {
    expect(keyVaultSecretName('SUPABASE_SERVICE_ROLE_KEY')).toBe('supabase-service-role-key');
  });
});
