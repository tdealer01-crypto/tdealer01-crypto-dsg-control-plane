import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AzureRuntimeEnvError,
  renderAzureAppSettings,
  validateContract,
} from '../../../scripts/render-azure-app-settings.mjs';

const CONTRACT = {
  schemaVersion: 'dsg.azure-runtime-env.v1',
  target: 'test-app',
  profiles: { core: 0, governed: 1, rollback: 2 },
  neverSync: [{ name: 'SUPABASE_DB_PASSWORD', reason: 'CI only' }],
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
    {
      name: 'OPTIONAL_PUBLIC',
      source: 'secretOrVariable',
      minimumProfile: 'core',
      required: false,
      phase: 'buildAndRuntime',
      slotSetting: true,
    },
  ],
};

describe('Azure App Service runtime ENV contract', () => {
  it('resolves a profile from configured values plus safe defaults', () => {
    const rendered = renderAzureAppSettings(CONTRACT, 'core', {
      DSG_ENV_CORE_SECRET: 'do-not-print-me',
      DSG_ENV_OPTIONAL_PUBLIC: 'public-value',
    });

    expect(rendered.settings).toEqual([
      { name: 'APP_URL', value: 'https://example.test', slotSetting: true },
      { name: 'CORE_SECRET', value: 'do-not-print-me', slotSetting: true },
      { name: 'OPTIONAL_PUBLIC', value: 'public-value', slotSetting: true },
    ]);
    expect(JSON.stringify(rendered.evidence)).not.toContain('do-not-print-me');
    expect(JSON.stringify(rendered.evidence)).not.toContain('public-value');
  });

  it('fails closed and reports names when a required setting is absent', () => {
    const render = () => renderAzureAppSettings(CONTRACT, 'governed', {
      DSG_ENV_CORE_SECRET: 'present',
    });
    expect(render).toThrow('Missing required governed settings: GOVERNED_SECRET');
    try {
      render();
    } catch (error) {
      expect(error).toBeInstanceOf(AzureRuntimeEnvError);
      expect(error).toMatchObject({
        code: 'MISSING_REQUIRED_SETTINGS',
        details: { missing: ['GOVERNED_SECRET'], profile: 'governed' },
      });
    }
  });

  it('does not include a higher profile in a lower profile render', () => {
    const rendered = renderAzureAppSettings(CONTRACT, 'core', {
      DSG_ENV_CORE_SECRET: 'present',
      DSG_ENV_GOVERNED_SECRET: 'configured-but-out-of-scope',
    });
    expect(rendered.settings.map((setting) => setting.name)).not.toContain('GOVERNED_SECRET');
  });

  it('rejects a setting that is also on the never-sync list', () => {
    const invalid = structuredClone(CONTRACT);
    invalid.settings.push({
      name: 'SUPABASE_DB_PASSWORD',
      source: 'secret',
      minimumProfile: 'core',
      required: true,
      phase: 'runtime',
      slotSetting: true,
    });
    expect(() => validateContract(invalid)).toThrow('SUPABASE_DB_PASSWORD is both allowlisted and denied');
  });

  it('validates the checked-in production contract', () => {
    const productionContract = JSON.parse(
      readFileSync('config/azure-runtime-env.contract.json', 'utf8'),
    );
    expect(() => validateContract(productionContract)).not.toThrow();
    expect(productionContract.neverSync.map(({ name }: { name: string }) => name)).toContain(
      'SUPABASE_DB_PASSWORD',
    );
  });
});
