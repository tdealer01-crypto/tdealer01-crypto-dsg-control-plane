#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { runVerifiedRepair } from '../lib/dsg/verified-repair';
import type { VerifiedRepairRequest } from '../lib/dsg/verified-repair';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function main(): Promise<void> {
  const requestPath = argument('--request');
  if (!requestPath) {
    throw new Error('Usage: npx tsx scripts/verified-repair.ts --request ./repair-request.json [--execute] [--validation fast|full]');
  }

  const parsed = JSON.parse(await readFile(path.resolve(requestPath), 'utf8')) as VerifiedRepairRequest;
  const execute = hasFlag('--execute');
  const validation = argument('--validation') as VerifiedRepairRequest['validationProfile'] | undefined;
  const result = await runVerifiedRepair({
    ...parsed,
    source: 'cli',
    execute,
    repoRoot: execute ? process.cwd() : undefined,
    validationProfile: validation ?? parsed.validationProfile ?? 'none',
  });

  // Evidence is intentionally hash/status oriented; candidate source text is
  // never printed by the CLI.
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status === 'BLOCKED') process.exitCode = 2;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
