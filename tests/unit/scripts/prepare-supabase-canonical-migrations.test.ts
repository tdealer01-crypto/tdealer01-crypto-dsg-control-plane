import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  prepareCanonicalMigrations,
  validateCanonicalLedger,
} from '../../../scripts/prepare-supabase-canonical-migrations.mjs';

const LEDGER = {
  schemaVersion: 'dsg.supabase-canonical-ledger.v1',
  projectRef: 'test-project',
  capturedAt: '2026-08-28T00:00:00Z',
  remoteHead: '20260823124642',
  policy: 'keep-canonical-and-newer-quarantine-local-before-head',
  migrations: [
    { version: '20260817081058', name: 'canonical_one' },
    { version: '20260823124642', name: 'canonical_two' },
  ],
};

describe('canonical Supabase migration preparation', () => {
  it('keeps canonical and newer files while quarantining legacy local-only files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsg-migrations-'));
    const migrationsDir = join(root, 'migrations');
    const quarantineDir = join(root, 'quarantine');
    await mkdir(migrationsDir);
    await Promise.all([
      writeFile(join(migrationsDir, '20260817081058_canonical_one.sql'), 'select 1;'),
      writeFile(join(migrationsDir, '20260823124642_canonical_two.sql'), 'select 2;'),
      writeFile(join(migrationsDir, '20260701000000_legacy.sql'), 'select 3;'),
      writeFile(join(migrationsDir, '20260701000000_legacy_duplicate.sql'), 'select 3;'),
      writeFile(join(migrationsDir, '20260825083000_pending.sql'), 'select 4;'),
      writeFile(join(migrationsDir, 'invalid_name.sql'), 'select 5;'),
    ]);

    const evidence = await prepareCanonicalMigrations({ ledger: LEDGER, migrationsDir, quarantineDir });
    expect(await readdir(migrationsDir)).toEqual([
      '20260817081058_canonical_one.sql',
      '20260823124642_canonical_two.sql',
      '20260825083000_pending.sql',
    ]);
    expect(await readdir(quarantineDir)).toEqual([
      '20260701000000_legacy.sql',
      '20260701000000_legacy_duplicate.sql',
      'invalid_name.sql',
    ]);
    expect(evidence).toMatchObject({ canonicalCount: 2, pendingCount: 1, quarantinedCount: 3, ready: true });
  });

  it('fails closed when canonical source is missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsg-migrations-'));
    const migrationsDir = join(root, 'migrations');
    await mkdir(migrationsDir);
    await writeFile(join(migrationsDir, '20260817081058_canonical_one.sql'), 'select 1;');
    await expect(prepareCanonicalMigrations({ ledger: LEDGER, migrationsDir, quarantineDir: join(root, 'q') }))
      .rejects.toThrow('missing 1 canonical remote migrations');
  });

  it('rejects a canonical name mismatch instead of trusting a timestamp alone', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsg-migrations-'));
    const migrationsDir = join(root, 'migrations');
    await mkdir(migrationsDir);
    await Promise.all([
      writeFile(join(migrationsDir, '20260817081058_wrong.sql'), 'select 1;'),
      writeFile(join(migrationsDir, '20260823124642_canonical_two.sql'), 'select 2;'),
    ]);
    await expect(prepareCanonicalMigrations({ ledger: LEDGER, migrationsDir, quarantineDir: join(root, 'q') }))
      .rejects.toThrow('canonical name mismatch');
  });

  it('validates the checked-in ledger snapshot', async () => {
    const ledger = JSON.parse(await readFile('supabase/canonical-migration-ledger.json', 'utf8'));
    expect(() => validateCanonicalLedger(ledger)).not.toThrow();
  });
});
