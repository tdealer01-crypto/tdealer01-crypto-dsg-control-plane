#!/usr/bin/env node

import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { AzureRuntimeEnvError, validateContract } from './render-azure-app-settings.mjs';

const VAULT_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9-]{2,23}$/;
const MODES = new Set(['reference', 'seed']);

function assert(condition, message, code = 'INVALID_KEY_VAULT_CONFIGURATION', details = {}) {
  if (!condition) throw new AzureRuntimeEnvError(message, code, details);
}

function configuredValue(environment, name) {
  const value = environment[`DSG_ENV_${name}`];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function keyVaultSecretName(settingName) {
  return settingName.toLowerCase().replaceAll('_', '-');
}

export function renderAzureKeyVaultSettings(
  contractInput,
  profile,
  vaultName,
  secretMode = 'reference',
  environment = process.env,
) {
  const contract = validateContract(contractInput);
  const selectedRank = contract.profiles[profile];
  assert(Number.isInteger(selectedRank), `Unknown profile: ${profile}`, 'UNKNOWN_PROFILE', { profile });
  assert(VAULT_NAME_PATTERN.test(vaultName ?? ''), 'Azure Key Vault name must be 3-24 characters, start with a letter, and contain only letters, digits, or hyphens', 'INVALID_VAULT_NAME', { vaultName });
  assert(MODES.has(secretMode), `Unknown secret mode: ${secretMode}`, 'UNKNOWN_SECRET_MODE', { secretMode });

  const selected = contract.settings.filter(
    (setting) => contract.profiles[setting.minimumProfile] <= selectedRank,
  );
  const missing = [];
  const appSettings = [];
  const vaultSecrets = [];
  const evidenceSettings = [];
  const usedSecretNames = new Set();

  for (const setting of selected) {
    if (setting.source === 'secret') {
      const secretName = keyVaultSecretName(setting.name);
      assert(!usedSecretNames.has(secretName), `Duplicate normalized Key Vault secret name: ${secretName}`, 'DUPLICATE_SECRET_NAME', { secretName });
      usedSecretNames.add(secretName);

      const configured = configuredValue(environment, setting.name);
      if (secretMode === 'seed' && configured === undefined) {
        if (setting.required) missing.push(setting.name);
        continue;
      }

      appSettings.push({
        name: setting.name,
        value: `@Microsoft.KeyVault(VaultName=${vaultName};SecretName=${secretName})`,
        slotSetting: setting.slotSetting,
      });
      if (secretMode === 'seed' && configured !== undefined) {
        vaultSecrets.push({ appSettingName: setting.name, secretName, value: configured });
      }
      evidenceSettings.push({
        name: setting.name,
        phase: setting.phase,
        required: setting.required,
        sourceType: setting.source,
        resolution: 'azure-key-vault-reference',
        secretName,
        slotSetting: setting.slotSetting,
      });
      continue;
    }

    const configured = configuredValue(environment, setting.name);
    const value = configured ?? setting.default;
    if (value === undefined) {
      if (setting.required) missing.push(setting.name);
      continue;
    }

    appSettings.push({ name: setting.name, value, slotSetting: setting.slotSetting });
    evidenceSettings.push({
      name: setting.name,
      phase: setting.phase,
      required: setting.required,
      sourceType: setting.source,
      resolution: configured === undefined ? 'contract-default' : 'github-actions-non-secret',
      slotSetting: setting.slotSetting,
    });
  }

  if (missing.length > 0) {
    throw new AzureRuntimeEnvError(
      `Missing required ${profile} settings for ${secretMode}: ${missing.join(', ')}`,
      'MISSING_REQUIRED_SETTINGS',
      { missing, profile, secretMode },
    );
  }

  return {
    appSettings,
    vaultSecrets,
    evidence: {
      schemaVersion: 'dsg.azure-key-vault-env-evidence.v1',
      contractSchemaVersion: contract.schemaVersion,
      target: contract.target,
      profile,
      secretMode,
      vaultName,
      appSettingCount: appSettings.length,
      secretReferenceCount: evidenceSettings.filter(({ sourceType }) => sourceType === 'secret').length,
      seededSecretNames: vaultSecrets.map(({ secretName }) => secretName).sort(),
      settings: evidenceSettings,
      neverSyncedNames: contract.neverSync.map((item) => item.name).sort(),
      truthBoundary: 'This evidence contains names only. PASS additionally requires Azure readback and every Key Vault reference status to be Resolved; it does not prove application readiness or deployment identity.',
    },
  };
}

async function writeJson(path, value, mode) {
  await mkdir(dirname(resolve(path)), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode });
  await chmod(path, mode);
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new AzureRuntimeEnvError('Arguments must be supplied as --name value pairs', 'INVALID_ARGUMENTS');
    }
    values.set(key.slice(2), value);
  }
  for (const required of ['contract', 'profile', 'vault-name', 'secret-mode', 'settings-out', 'vault-secrets-out', 'evidence-out']) {
    if (!values.get(required)) throw new AzureRuntimeEnvError(`Missing --${required}`, 'INVALID_ARGUMENTS');
  }
  return values;
}

export async function runCli(argv = process.argv.slice(2), environment = process.env) {
  const args = parseArguments(argv);
  const contract = JSON.parse(await readFile(args.get('contract'), 'utf8'));
  const rendered = renderAzureKeyVaultSettings(
    contract,
    args.get('profile'),
    args.get('vault-name'),
    args.get('secret-mode'),
    environment,
  );

  await writeJson(args.get('settings-out'), rendered.appSettings, 0o600);
  await writeJson(args.get('vault-secrets-out'), rendered.vaultSecrets, 0o600);
  await writeJson(args.get('evidence-out'), rendered.evidence, 0o644);

  console.log(`Resolved ${rendered.appSettings.length} Azure App Settings for profile ${args.get('profile')}.`);
  console.log(`Key Vault references: ${rendered.evidence.secretReferenceCount}; seed entries: ${rendered.vaultSecrets.length}.`);
  console.log(`Names: ${rendered.appSettings.map(({ name }) => name).join(', ')}`);
  return rendered.evidence;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectRun) {
  runCli().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`::error::Azure Key Vault render failed: ${message}`);
    process.exitCode = 1;
  });
}
