#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOFTWARE_EVIDENCE_SCHEMA = 'dsg.software-evidence.v1';
export const SOFTWARE_GATE_SCHEMA = 'dsg.software-gate.v1';

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const REQUIRED_STAGES = ['scan', 'typecheck', 'unit', 'build', 'security'];
const ACCEPTED_PROVENANCE = new Set([
  'MEASURED',
  'OBSERVED',
  'STATICALLY_VERIFIED',
  'FORMALLY_VERIFIED',
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, stable(child)]),
    );
  }
  return value;
}

function sha256Json(value) {
  const encoded = JSON.stringify(stable(value));
  return `sha256:${createHash('sha256').update(encoded).digest('hex')}`;
}

function stageProblems(name, stage) {
  const problems = [];
  if (!stage || typeof stage !== 'object') {
    problems.push(`${name.toUpperCase()}_EVIDENCE_MISSING`);
    return problems;
  }
  if (stage.status !== 'PASS') problems.push(`${name.toUpperCase()}_NOT_PASS`);
  if (!ACCEPTED_PROVENANCE.has(stage.provenance)) {
    problems.push(`${name.toUpperCase()}_PROVENANCE_NOT_VERIFIED`);
  }
  if (!HASH_PATTERN.test(stage.evidenceHash ?? '')) {
    problems.push(`${name.toUpperCase()}_EVIDENCE_HASH_INVALID`);
  }
  return problems;
}

export function evaluateSoftwareEvidence(input) {
  const blockers = [];
  const warnings = [];

  if (!input || typeof input !== 'object') blockers.push('EVIDENCE_REQUIRED');
  if (input?.schema !== SOFTWARE_EVIDENCE_SCHEMA) blockers.push('EVIDENCE_SCHEMA_INVALID');
  if (typeof input?.commit !== 'string' || !/^[a-f0-9]{7,64}$/i.test(input.commit)) {
    blockers.push('COMMIT_SHA_REQUIRED');
  }

  for (const name of REQUIRED_STAGES) {
    blockers.push(...stageProblems(name, input?.stages?.[name]));
  }

  const benchmark = input?.stages?.benchmark;
  if (benchmark?.required === true) {
    blockers.push(...stageProblems('benchmark', benchmark));
  } else if (!benchmark || benchmark.status !== 'PASS') {
    warnings.push('CAPACITY_NOT_MEASURED_FOR_RELEASE_CLAIM');
  } else if (!ACCEPTED_PROVENANCE.has(benchmark.provenance)) {
    warnings.push('CAPACITY_EVIDENCE_IS_ESTIMATED_OR_UNVERIFIED');
  }

  const findings = input?.findings;
  if (!findings || typeof findings.open !== 'number' || findings.open < 0) {
    blockers.push('OPEN_FINDING_COUNT_REQUIRED');
  } else if (findings.open > 0) {
    blockers.push(`UNRESOLVED_FINDINGS:${findings.open}`);
  }

  const repair = input?.repair;
  if (!repair || typeof repair !== 'object') {
    blockers.push('REPAIR_STATE_REQUIRED');
  } else {
    const attempts = Number.isInteger(repair.attempts) ? repair.attempts : -1;
    const maxAttempts = Number.isInteger(repair.maxAttempts) ? repair.maxAttempts : -1;
    if (attempts < 0 || maxAttempts < 1) blockers.push('REPAIR_ATTEMPT_BOUNDS_INVALID');
    if (attempts > maxAttempts && maxAttempts >= 1) blockers.push('REPAIR_ATTEMPTS_EXCEEDED');
    if (!['NOT_REQUIRED', 'REPAIRED'].includes(repair.status)) {
      blockers.push(`REPAIR_NOT_VERIFIED:${String(repair.status ?? 'MISSING')}`);
    }
  }

  const normalized = {
    schema: SOFTWARE_GATE_SCHEMA,
    sourceSchema: input?.schema ?? null,
    commit: input?.commit ?? null,
    blockers: [...new Set(blockers)].sort(),
    warnings: [...new Set(warnings)].sort(),
    stageEvidenceHashes: Object.fromEntries(
      Object.entries(input?.stages ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, stage]) => [name, stage?.evidenceHash ?? null]),
    ),
    findings: input?.findings ?? null,
    repair: input?.repair ?? null,
  };

  const status = normalized.blockers.length > 0 ? 'BLOCK' : 'READY_FOR_DSG_GATE';
  return {
    ...normalized,
    status,
    humanReleaseRequired: true,
    productionAllowed: false,
    capacityClaimAllowed:
      input?.stages?.benchmark?.required === true &&
      input?.stages?.benchmark?.status === 'PASS' &&
      ACCEPTED_PROVENANCE.has(input?.stages?.benchmark?.provenance),
    evidenceBundleHash: sha256Json(normalized),
    nextAction:
      status === 'BLOCK'
        ? 'Resolve blockers, let the AI agent repair the PR, and rerun this gate.'
        : 'Send this evidence bundle to the canonical DSG plan/scope/authorization gate; human release is still required when policy requires it.',
    truthBoundary:
      'READY_FOR_DSG_GATE is not production ALLOW. This layer verifies software evidence only; canonical DSG authorization, controlled execution, observed postconditions, receipt, and replay remain authoritative.',
  };
}

async function main() {
  const inputIndex = process.argv.indexOf('--input');
  const outputIndex = process.argv.indexOf('--output');
  const inputPath = inputIndex >= 0 ? process.argv[inputIndex + 1] : undefined;
  const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : undefined;
  if (!inputPath) {
    throw new Error('Usage: node scripts/verified-software-gate.mjs --input evidence.json [--output gate.json]');
  }

  const evidence = JSON.parse(await readFile(path.resolve(inputPath), 'utf8'));
  const result = evaluateSoftwareEvidence(evidence);
  const rendered = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath) await writeFile(path.resolve(outputPath), rendered, 'utf8');
  process.stdout.write(rendered);
  if (result.status === 'BLOCK') process.exitCode = 2;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
