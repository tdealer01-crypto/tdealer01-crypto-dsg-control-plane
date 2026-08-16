#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const logDir = process.env.DSG_EVIDENCE_DIR || '.dsg-evidence';
const output = process.env.DSG_EVIDENCE_OUTPUT || `${logDir}/software-evidence.json`;
const commit = process.env.COMMIT_SHA || process.env.GITHUB_SHA;
const benchmarkRequired = process.env.BENCHMARK_REQUIRED === 'true';

if (!commit || !/^[a-f0-9]{7,64}$/i.test(commit)) {
  throw new Error('COMMIT_SHA_REQUIRED');
}

const status = (value) => value === 'success' ? 'PASS' : 'FAIL';
const benchmarkStatus = (value) => value === 'success' ? 'PASS' : benchmarkRequired ? 'FAIL' : 'SKIP';
const hashFile = async (name) => {
  let body = '';
  try { body = await readFile(`${logDir}/${name}.log`, 'utf8'); } catch {}
  return `sha256:${createHash('sha256').update(body).digest('hex')}`;
};

const outcomes = {
  scan: process.env.SCAN_OUTCOME,
  typecheck: process.env.TYPECHECK_OUTCOME,
  unit: process.env.UNIT_OUTCOME,
  build: process.env.BUILD_OUTCOME,
  security: process.env.SECURITY_OUTCOME,
  benchmark: process.env.BENCHMARK_OUTCOME,
};

const requiredOutcomes = [
  outcomes.scan,
  outcomes.typecheck,
  outcomes.unit,
  outcomes.build,
  outcomes.security,
  ...(benchmarkRequired ? [outcomes.benchmark] : []),
];
const open = requiredOutcomes.filter((value) => value !== 'success').length;

const evidence = {
  schema: 'dsg.software-evidence.v1',
  commit,
  findings: { open, repaired: 0 },
  repair: {
    status: open === 0 ? 'NOT_REQUIRED' : 'PENDING',
    attempts: open === 0 ? 0 : 1,
    maxAttempts: 5,
  },
  stages: {
    scan: { status: status(outcomes.scan), provenance: 'STATICALLY_VERIFIED', evidenceHash: await hashFile('scan') },
    typecheck: { status: status(outcomes.typecheck), provenance: 'MEASURED', evidenceHash: await hashFile('typecheck') },
    unit: { status: status(outcomes.unit), provenance: 'MEASURED', evidenceHash: await hashFile('unit') },
    build: { status: status(outcomes.build), provenance: 'MEASURED', evidenceHash: await hashFile('build') },
    security: { status: status(outcomes.security), provenance: 'STATICALLY_VERIFIED', evidenceHash: await hashFile('security') },
    benchmark: {
      status: benchmarkStatus(outcomes.benchmark),
      required: benchmarkRequired,
      provenance: 'MEASURED',
      evidenceHash: await hashFile('benchmark'),
    },
  },
};

await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
