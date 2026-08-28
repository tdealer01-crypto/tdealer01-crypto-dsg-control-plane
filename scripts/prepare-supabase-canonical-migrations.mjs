#!/usr/bin/env node

import { chmod, copyFile, mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SCHEMA = 'dsg.supabase-canonical-ledger.v1';
const VERSIONED_FILE = /^(\d{10}|\d{14})_(.+)\.sql$/;

export class CanonicalMigrationError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'CanonicalMigrationError';
    this.code = code;
    this.details = details;
  }
}

function assert(condition, message, code = 'INVALID_LEDGER', details = {}) {
  if (!condition) throw new CanonicalMigrationError(message, code, details);
}

export function validateCanonicalLedger(input) {
  assert(input?.schemaVersion === SCHEMA, `Unsupported ledger schema: ${input?.schemaVersion ?? '(missing)'}`);
  assert(typeof input?.projectRef === 'string' && input.projectRef.length > 0, 'projectRef is required');
  assert(/^\d{10}$|^\d{14}$/.test(input?.remoteHead ?? ''), 'remoteHead must be a 10- or 14-digit version');
  assert(Array.isArray(input?.migrations) && input.migrations.length > 0, 'migrations must be a non-empty array');

  const seen = new Set();
  let previous = '';
  for (const migration of input.migrations) {
    assert(/^\d{10}$|^\d{14}$/.test(migration?.version ?? ''), 'migration version is invalid');
    assert(typeof migration?.name === 'string' && migration.name.length > 0, `${migration.version} name is missing`);
    assert(!seen.has(migration.version), `duplicate canonical version: ${migration.version}`);
    assert(previous === '' || previous.localeCompare(migration.version) < 0, 'canonical versions must be strictly sorted');
    seen.add(migration.version);
    previous = migration.version;
  }
  assert(previous === input.remoteHead, `remoteHead ${input.remoteHead} does not match final version ${previous}`);
  return input;
}

async function moveFile(source, target) {
  await mkdir(dirname(target), { recursive: true, mode: 0o700 });
  try {
    await rename(source, target);
  } catch (error) {
    if (error?.code !== 'EXDEV') throw error;
    await copyFile(source, target);
    await unlink(source);
  }
}

export async function prepareCanonicalMigrations({ ledger, migrationsDir, quarantineDir }) {
  const canonical = validateCanonicalLedger(ledger);
  const migrationRoot = resolve(migrationsDir);
  const quarantineRoot = resolve(quarantineDir);
  assert(quarantineRoot !== migrationRoot, 'quarantine directory must differ from migrations directory', 'INVALID_TARGET');
  assert(quarantineRoot !== '/', 'quarantine directory cannot be filesystem root', 'INVALID_TARGET');

  const canonicalByVersion = new Map(canonical.migrations.map((item) => [item.version, item.name]));
  const entries = (await readdir(migrationRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort();
  const localByVersion = new Map();
  const keptCanonicalNames = [];
  const pendingNames = [];
  const quarantinedNames = [];

  for (const name of entries) {
    const match = VERSIONED_FILE.exec(name);
    if (!match) {
      quarantinedNames.push(name);
      continue;
    }
    const [, version, migrationName] = match;
    assert(!localByVersion.has(version), `duplicate local migration version ${version}: ${localByVersion.get(version)}, ${name}`, 'DUPLICATE_LOCAL_VERSION');
    localByVersion.set(version, name);

    if (canonicalByVersion.has(version)) {
      const canonicalName = canonicalByVersion.get(version);
      assert(migrationName === canonicalName, `canonical name mismatch for ${version}: expected ${canonicalName}, found ${migrationName}`, 'CANONICAL_NAME_MISMATCH', { canonicalName, name, version });
      keptCanonicalNames.push(name);
    } else if (version.localeCompare(canonical.remoteHead) > 0) {
      pendingNames.push(name);
    } else {
      quarantinedNames.push(name);
    }
  }

  const missing = canonical.migrations
    .filter(({ version }) => !localByVersion.has(version))
    .map(({ version, name }) => `${version}_${name}.sql`);
  assert(missing.length === 0, `Local source is missing ${missing.length} canonical remote migrations: ${missing.join(', ')}`, 'MISSING_CANONICAL_MIGRATIONS', { missing });

  await mkdir(quarantineRoot, { recursive: true, mode: 0o700 });
  for (const name of quarantinedNames) {
    await moveFile(join(migrationRoot, name), join(quarantineRoot, basename(name)));
  }

  return {
    schemaVersion: 'dsg.supabase-canonical-ledger-preparation.v1',
    projectRef: canonical.projectRef,
    remoteHead: canonical.remoteHead,
    canonicalCount: keptCanonicalNames.length,
    pendingCount: pendingNames.length,
    quarantinedCount: quarantinedNames.length,
    keptCanonicalNames,
    pendingNames,
    quarantinedNames,
    ready: true,
    truthBoundary: 'This evidence proves only the runner migration set. Database mutation and live schema verification require separate evidence.',
  };
}

function parseArguments(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new CanonicalMigrationError('Arguments must be --name value pairs', 'INVALID_ARGUMENTS');
    args.set(key.slice(2), value);
  }
  for (const required of ['ledger', 'migrations-dir', 'quarantine-dir', 'evidence-out']) {
    if (!args.get(required)) throw new CanonicalMigrationError(`Missing --${required}`, 'INVALID_ARGUMENTS');
  }
  return args;
}

export async function runCli(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  const ledger = JSON.parse(await readFile(args.get('ledger'), 'utf8'));
  const evidence = await prepareCanonicalMigrations({
    ledger,
    migrationsDir: args.get('migrations-dir'),
    quarantineDir: args.get('quarantine-dir'),
  });
  const evidencePath = args.get('evidence-out');
  await mkdir(dirname(resolve(evidencePath)), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', mode: 0o644 });
  await chmod(evidencePath, 0o644);
  console.log(`Prepared canonical Supabase ledger: ${evidence.canonicalCount} canonical, ${evidence.pendingCount} pending, ${evidence.quarantinedCount} legacy local-only files quarantined.`);
  console.log(`Pending names: ${evidence.pendingNames.join(', ') || '(none)'}`);
  return evidence;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectRun) {
  runCli().catch((error) => {
    console.error(`::error::Canonical Supabase migration preparation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exitCode = 1;
  });
}
