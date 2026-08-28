#!/usr/bin/env node

import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CONTRACT_SCHEMA = 'dsg.azure-runtime-env.v1';
const NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const SOURCE_TYPES = new Set(['secret', 'variable', 'secretOrVariable']);
const PHASES = new Set(['runtime', 'buildAndRuntime']);

export class AzureRuntimeEnvError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'AzureRuntimeEnvError';
    this.code = code;
    this.details = details;
  }
}

function assert(condition, message, code = 'INVALID_CONTRACT', details = {}) {
  if (!condition) throw new AzureRuntimeEnvError(message, code, details);
}

export function validateContract(contract) {
  assert(contract?.schemaVersion === CONTRACT_SCHEMA, `Unsupported contract schema: ${contract?.schemaVersion ?? '(missing)'}`);
  assert(contract?.profiles && typeof contract.profiles === 'object', 'profiles must be an object');
  assert(Array.isArray(contract?.settings), 'settings must be an array');
  assert(Array.isArray(contract?.neverSync), 'neverSync must be an array');

  const profileNames = Object.keys(contract.profiles);
  const ranks = Object.values(contract.profiles);
  assert(profileNames.length > 0, 'at least one profile is required');
  assert(ranks.every((rank) => Number.isInteger(rank) && rank >= 0), 'profile ranks must be non-negative integers');
  assert(new Set(ranks).size === ranks.length, 'profile ranks must be unique');

  const denied = new Set();
  for (const item of contract.neverSync) {
    assert(NAME_PATTERN.test(item?.name ?? ''), 'neverSync contains an invalid name');
    assert(!denied.has(item.name), `duplicate neverSync name: ${item.name}`);
    denied.add(item.name);
  }

  const names = new Set();
  for (const setting of contract.settings) {
    assert(NAME_PATTERN.test(setting?.name ?? ''), 'setting contains an invalid name');
    assert(!names.has(setting.name), `duplicate setting name: ${setting.name}`);
    assert(!denied.has(setting.name), `${setting.name} is both allowlisted and denied`);
    assert(SOURCE_TYPES.has(setting.source), `${setting.name} has an invalid source`);
    assert(profileNames.includes(setting.minimumProfile), `${setting.name} has an invalid minimumProfile`);
    assert(typeof setting.required === 'boolean', `${setting.name} required must be boolean`);
    assert(PHASES.has(setting.phase), `${setting.name} has an invalid phase`);
    assert(typeof setting.slotSetting === 'boolean', `${setting.name} slotSetting must be boolean`);
    if (Object.hasOwn(setting, 'default')) {
      assert(setting.source !== 'secret', `${setting.name} cannot give a secret a committed default`);
      assert(typeof setting.default === 'string' && setting.default.length > 0, `${setting.name} default must be a non-empty string`);
    }
    names.add(setting.name);
  }

  return contract;
}

function configuredValue(environment, name) {
  const value = environment[`DSG_ENV_${name}`];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function renderAzureAppSettings(contractInput, profile, environment = process.env) {
  const contract = validateContract(contractInput);
  const selectedRank = contract.profiles[profile];
  assert(Number.isInteger(selectedRank), `Unknown profile: ${profile}`, 'UNKNOWN_PROFILE', { profile });

  const selected = contract.settings.filter(
    (setting) => contract.profiles[setting.minimumProfile] <= selectedRank,
  );
  const missing = [];
  const settings = [];
  const evidenceSettings = [];

  for (const setting of selected) {
    const configured = configuredValue(environment, setting.name);
    const value = configured ?? setting.default;
    if (value === undefined) {
      if (setting.required) missing.push(setting.name);
      continue;
    }

    settings.push({
      name: setting.name,
      value,
      slotSetting: setting.slotSetting,
    });
    evidenceSettings.push({
      name: setting.name,
      phase: setting.phase,
      required: setting.required,
      sourceType: setting.source,
      resolution: configured === undefined ? 'contract-default' : 'github-actions',
      slotSetting: setting.slotSetting,
    });
  }

  if (missing.length > 0) {
    throw new AzureRuntimeEnvError(
      `Missing required ${profile} settings: ${missing.join(', ')}`,
      'MISSING_REQUIRED_SETTINGS',
      { missing, profile },
    );
  }

  return {
    settings,
    evidence: {
      schemaVersion: 'dsg.azure-runtime-env-evidence.v1',
      contractSchemaVersion: contract.schemaVersion,
      target: contract.target,
      profile,
      settingCount: settings.length,
      settings: evidenceSettings,
      neverSyncedNames: contract.neverSync.map((item) => item.name).sort(),
      truthBoundary: 'This evidence proves contract resolution only. Azure mutation and deployed application readiness require separate verification.',
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
  for (const required of ['contract', 'profile', 'settings-out', 'evidence-out']) {
    if (!values.get(required)) {
      throw new AzureRuntimeEnvError(`Missing --${required}`, 'INVALID_ARGUMENTS');
    }
  }
  return values;
}

export async function runCli(argv = process.argv.slice(2), environment = process.env) {
  const args = parseArguments(argv);
  const contract = JSON.parse(await readFile(args.get('contract'), 'utf8'));
  const rendered = renderAzureAppSettings(contract, args.get('profile'), environment);

  // The settings file contains secrets. Keep it runner-local, mode 0600, and
  // never upload it as an artifact. The workflow deletes it in an always() step.
  await writeJson(args.get('settings-out'), rendered.settings, 0o600);
  await writeJson(args.get('evidence-out'), rendered.evidence, 0o644);

  console.log(`Resolved ${rendered.settings.length} Azure App Settings for profile ${args.get('profile')}.`);
  console.log(`Names: ${rendered.settings.map((setting) => setting.name).join(', ')}`);
  return rendered.evidence;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectRun) {
  runCli().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`::error::Azure runtime ENV render failed: ${message}`);
    process.exitCode = 1;
  });
}
