#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  generateRepairCandidates,
  runVerifiedRepair,
  type RepairCandidateProvider,
  type RepairValidationProfile,
  type VerifiedRepairRequest,
} from '../lib/dsg/verified-repair';

type AutonomousRepairInput = Omit<VerifiedRepairRequest, 'candidates' | 'source' | 'repoRoot' | 'execute'> & {
  diagnostics?: string;
  provider?: RepairCandidateProvider;
  model?: string;
  maxCandidates?: number;
};

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function parseProvider(value: string | undefined): RepairCandidateProvider | undefined {
  if (!value) return undefined;
  if (!['auto', 'openai', 'anthropic', 'codex', 'claude'].includes(value)) {
    throw new Error(`INVALID_REPAIR_PROVIDER:${value}`);
  }
  return value as RepairCandidateProvider;
}

function parseValidation(value: string | undefined): RepairValidationProfile | undefined {
  if (!value) return undefined;
  if (!['none', 'fast', 'full'].includes(value)) throw new Error(`INVALID_VALIDATION_PROFILE:${value}`);
  return value as RepairValidationProfile;
}

async function main(): Promise<void> {
  const requestPath = argument('--request');
  if (!requestPath) {
    throw new Error([
      'Usage: npx tsx scripts/autonomous-repair.ts --request ./repair-request.json',
      '  [--provider auto|codex|claude|openai|anthropic] [--model MODEL]',
      '  [--execute] [--validation none|fast|full] [--repo PATH] [--output PATH]',
    ].join('\n'));
  }

  const absoluteRequest = path.resolve(requestPath);
  const parsed = JSON.parse(await readFile(absoluteRequest, 'utf8')) as AutonomousRepairInput;
  const repoRoot = path.resolve(argument('--repo') || process.cwd());
  const execute = hasFlag('--execute');
  const provider = parseProvider(argument('--provider')) ?? parsed.provider ?? 'auto';
  const model = argument('--model') || parsed.model;
  const validationProfile = parseValidation(argument('--validation')) ??
    parsed.validationProfile ??
    (execute ? 'full' : 'none');

  const generation = await generateRepairCandidates({
    jobId: parsed.jobId,
    finding: parsed.finding,
    allowedFiles: parsed.allowedFiles,
    repoRoot,
    diagnostics: parsed.diagnostics,
    provider,
    model,
    maxCandidates: parsed.maxCandidates,
  });

  const verifiedRepair = await runVerifiedRepair({
    ...parsed,
    candidates: generation.candidates,
    source: 'cli',
    execute,
    repoRoot: execute ? repoRoot : undefined,
    validationProfile,
  });

  const result = {
    schema: 'dsg.autonomous-repair.v1',
    jobId: parsed.jobId,
    providerRequested: provider,
    generation: generation.evidence,
    verifiedRepair,
    baseCheckoutModified: false,
    nextAction: verifiedRepair.status === 'VERIFIED_IN_SIMULATION'
      ? 'Review the verified diff/evidence and use the separate approval-boundary action to promote it. The base checkout was not modified.'
      : verifiedRepair.nextAction,
    truthBoundary: 'AI generates candidates only. QUBO/Ising proposes a set; Z3, the controlled worktree executor, fixed validation commands, audit/evidence, and release gates remain authoritative.',
  };

  const rendered = `${JSON.stringify(result, null, 2)}\n`;
  const outputPath = argument('--output');
  if (outputPath) {
    const absoluteOutput = path.resolve(outputPath);
    await mkdir(path.dirname(absoluteOutput), { recursive: true });
    await writeFile(absoluteOutput, rendered, 'utf8');
  }

  process.stdout.write(rendered);
  if (verifiedRepair.status === 'BLOCKED') process.exitCode = 2;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
