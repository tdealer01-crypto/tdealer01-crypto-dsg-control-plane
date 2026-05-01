#!/usr/bin/env node

import fs from 'node:fs';

const requiredFiles = [
  'lib/dsg/deterministic/types.ts',
  'lib/dsg/deterministic/proof-hash.ts',
  'lib/dsg/deterministic/policy-manifest.ts',
  'lib/dsg/deterministic/solver-metadata.ts',
  'lib/dsg/deterministic/proof-engine.ts',
  'lib/dsg/deterministic/gate-engine.ts',
  'app/api/dsg/v1/proofs/prove/route.ts',
  'app/api/dsg/v1/gates/evaluate/route.ts',
  'app/api/dsg/v1/policies/manifest/route.ts',
];

const requiredText = [
  { file: 'lib/dsg/deterministic/types.ts', text: 'nonce: string', reason: 'proof request must require nonce' },
  { file: 'lib/dsg/deterministic/types.ts', text: 'idempotencyKey: string', reason: 'proof request must require idempotency key' },
  { file: 'lib/dsg/deterministic/types.ts', text: 'replayProtection', reason: 'proof must expose replay protection evidence' },
  { file: 'lib/dsg/deterministic/types.ts', text: "export type DeterministicGateStatus = 'PASS' | 'BLOCK' | 'REVIEW'", reason: 'canonical gate must exclude UNSUPPORTED' },
  { file: 'lib/dsg/deterministic/gate-engine.ts', text: "proofStatus === 'UNSUPPORTED'", reason: 'UNSUPPORTED must be handled explicitly' },
  { file: 'lib/dsg/deterministic/gate-engine.ts', text: "riskLevel === 'low' ? 'REVIEW' : 'BLOCK'", reason: 'UNSUPPORTED must never become PASS' },
  { file: 'lib/dsg/deterministic/policy-manifest.ts', text: 'DETERMINISTIC_POLICY_VERSION', reason: 'policy version must be source controlled' },
  { file: 'lib/dsg/deterministic/policy-manifest.ts', text: 'constraintSetHash', reason: 'constraint set hash must be published in manifest' },
  { file: 'lib/dsg/deterministic/solver-metadata.ts', text: 'DSG_DETERMINISTIC_SOLVER_VERSION', reason: 'solver version must be configurable, not hardcoded' },
  { file: 'app/api/dsg/v1/proofs/prove/route.ts', text: 'missing_nonce', reason: 'proof API must reject missing nonce' },
  { file: 'app/api/dsg/v1/proofs/prove/route.ts', text: 'missing_idempotency_key', reason: 'proof API must reject missing idempotency key' },
  { file: 'app/api/dsg/v1/gates/evaluate/route.ts', text: 'missing_nonce', reason: 'gate API must reject missing nonce' },
  { file: 'app/api/dsg/v1/gates/evaluate/route.ts', text: 'missing_idempotency_key', reason: 'gate API must reject missing idempotency key' },
];

const failures = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) failures.push({ type: 'missing-file', file });
}

for (const check of requiredText) {
  if (!fs.existsSync(check.file)) {
    failures.push({ type: 'missing-file-for-text-check', ...check });
    continue;
  }
  const content = fs.readFileSync(check.file, 'utf8');
  if (!content.includes(check.text)) failures.push({ type: 'missing-required-text', ...check });
}

const result = {
  ok: failures.length === 0,
  type: 'dsg-deterministic-module-verification',
  checkedAt: new Date().toISOString(),
  requiredFiles: requiredFiles.length,
  requiredTextChecks: requiredText.length,
  failures,
  userOutcome: failures.length === 0
    ? 'Deterministic module has proof/gate APIs, policy manifest, solver metadata, replay protection, and UNSUPPORTED-is-never-PASS enforcement.'
    : 'Deterministic module verification failed. Fix failures before merge/deploy.',
};

fs.mkdirSync('artifacts/deterministic-module', { recursive: true });
fs.writeFileSync('artifacts/deterministic-module/verification-result.json', `${JSON.stringify(result, null, 2)}\n`);

if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
