#!/usr/bin/env node
/**
 * Reads vitest coverage-summary.json + optional test-results JSON,
 * builds a CCVS evidence envelope, and writes it to disk.
 *
 * Usage (CI):
 *   node scripts/emit-test-evidence.mjs \
 *     --type unit \
 *     --suite policy-engine \
 *     --output ccvs-unit-evidence.json \
 *     [--previous-hash sha256:...]
 *
 * The script exits 0 on success, 1 on error.
 */

import fs from 'node:fs';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const flag = (name) => {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : undefined;
};

const evidenceType = flag('--type') ?? 'unit';
const suiteName = flag('--suite') ?? 'default';
const outputPath = flag('--output') ?? 'ccvs-evidence.json';
const previousChainHash = flag('--previous-hash') ?? '';
const policyVersion = flag('--policy-version') ?? process.env.DSG_POLICY_VERSION ?? 'v1';

const SEVERITY = {
  unit: 1, integration: 2, adversarial: 3, replay: 3,
  sbom: 3, mutation: 4, oversight: 4, provenance: 5,
};

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

// Read coverage-summary.json if present
let coverage = {};
try {
  const summary = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
  const t = summary.total;
  coverage = {
    lines: t.lines.pct,
    branches: t.branches.pct,
    functions: t.functions.pct,
    statements: t.statements.pct,
  };
} catch {
  console.warn('[emit-evidence] coverage-summary.json not found — coverage will be empty');
}

// Read test result JSON if present (vitest --reporter=json)
let tests_total = 0, tests_passed = 0, tests_failed = 0, duration_ms = 0;
try {
  const resultPath = flag('--results') ?? 'test-results.json';
  const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  tests_total = result.numTotalTests ?? 0;
  tests_passed = result.numPassedTests ?? 0;
  tests_failed = result.numFailedTests ?? 0;
  duration_ms = Math.round((result.testResults ?? []).reduce((s, r) => s + (r.duration ?? 0), 0));
} catch {
  // optional
}

const repo = process.env.GITHUB_REPOSITORY ?? 'local/unknown';
const commit = process.env.GITHUB_SHA ?? 'unknown';
const ref = process.env.GITHUB_REF ?? '';
const runId = process.env.GITHUB_RUN_ID ?? 'local-' + Date.now();
const attempt = process.env.GITHUB_RUN_ATTEMPT ?? '1';

const envelope = {
  schema_version: '1.0.0',
  evidence_type: evidenceType,
  severity_level: SEVERITY[evidenceType] ?? 1,
  subject: [{ name: 'repo:' + repo, digest: { sha1: commit } }],
  run: {
    repo,
    commit,
    ...(ref ? { ref } : {}),
    workflow_run_id: runId,
    builder_id: 'https://github.com/actions/runner',
    invocation_id: runId + '-' + attempt,
    ...(process.env.RUNNER_OS ? { runner_os: process.env.RUNNER_OS } : {}),
  },
  oidc: {
    issuer: 'https://token.actions.githubusercontent.com',
    audience: 'ccvs-evidence',
    sub: 'repo:' + repo + ':ref:' + ref,
    repository: repo,
    ref,
  },
  metrics: {
    tests_total,
    tests_passed,
    tests_failed,
    coverage,
    ...(duration_ms ? { duration_ms } : {}),
  },
  integrity: {
    previous_chain_hash: previousChainHash,
    chain_hash: '',
  },
  policy_version: policyVersion,
  generated_at: new Date().toISOString(),
};

const withoutHash = { ...envelope, integrity: { ...envelope.integrity, chain_hash: '' } };
const digest = sha256Hex(canonicalize(withoutHash));
envelope.integrity.chain_hash = 'sha256:' + digest;

fs.writeFileSync(outputPath, JSON.stringify(envelope, null, 2));

console.log('[emit-evidence] type=' + evidenceType + ' suite=' + suiteName);
console.log('[emit-evidence] chain_hash=' + envelope.integrity.chain_hash);
console.log('[emit-evidence] severity_level=' + envelope.severity_level);
console.log('[emit-evidence] written → ' + outputPath);
