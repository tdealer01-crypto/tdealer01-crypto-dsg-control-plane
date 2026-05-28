#!/usr/bin/env node
/**
 * Reads individual CCVS evidence envelopes from disk,
 * matches them to the requirement catalog, and writes the
 * compliance matrix JSON.
 *
 * Usage:
 *   node scripts/generate-compliance-matrix.mjs \
 *     --evidence-dir ./ccvs-evidence \
 *     --output ccvs-compliance-matrix.json \
 *     [--policy-version v1]
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const flag = (name) => {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : undefined;
};

const evidenceDir = flag('--evidence-dir') ?? './ccvs-evidence';
const outputPath = flag('--output') ?? 'ccvs-compliance-matrix.json';
const policyVersion = flag('--policy-version') ?? process.env.DSG_POLICY_VERSION ?? 'v1';

// Inline the requirement catalog (mirrors lib/ccvs/compliance-matrix.ts)
const REQUIREMENT_CATALOG = [
  { requirement_id: 'EU-AI-ACT-ART14', framework: 'EU AI Act', article_or_section: 'Article 14', title: 'Human oversight', control_id: 'CTRL-HUMAN-GATE', control_description: 'Human approval required before high-risk AI actions', test_file: 'tests/dsg/agent-command-gate.test.ts', test_suite: 'agent-command-gate', evidence_type: 'integration', min_severity_level: 2, mutation_required: true },
  { requirement_id: 'EU-AI-ACT-ART12', framework: 'EU AI Act', article_or_section: 'Article 12', title: 'Record-keeping and logging', control_id: 'CTRL-IMMUTABLE-AUDIT', control_description: 'Audit logs must be immutable and tamper-evident', test_file: 'tests/integration/api/audit-evidence.test.ts', test_suite: 'audit-evidence', evidence_type: 'adversarial', min_severity_level: 3, mutation_required: true },
  { requirement_id: 'ISO42001-A7.3', framework: 'ISO 42001', article_or_section: 'Annex A 7.3', title: 'AI system risk assessment', control_id: 'CTRL-RISK-GATE', control_description: 'Risk scoring and decision gate for AI system actions', test_file: 'tests/failure/replay-matrix.test.ts', test_suite: 'replay-matrix', evidence_type: 'adversarial', min_severity_level: 3, mutation_required: true },
  { requirement_id: 'ISO42001-A9.2', framework: 'ISO 42001', article_or_section: 'Annex A 9.2', title: 'Internal audit', control_id: 'CTRL-AUDIT-TRAIL', control_description: 'Complete audit trail for all governed AI decisions', test_file: 'tests/integration/api/audit-route.test.ts', test_suite: 'audit-route', evidence_type: 'integration', min_severity_level: 2, mutation_required: false },
  { requirement_id: 'NIST-RMF-GOVERN-1.1', framework: 'NIST AI RMF', article_or_section: 'GOVERN 1.1', title: 'AI risk governance policies', control_id: 'CTRL-POLICY-ENGINE', control_description: 'Policy engine enforces governance rules on every AI action', test_file: 'tests/unit/spine/pipeline.test.ts', test_suite: 'spine-pipeline', evidence_type: 'unit', min_severity_level: 1, mutation_required: true },
  { requirement_id: 'NIST-RMF-MAP-2.1', framework: 'NIST AI RMF', article_or_section: 'MAP 2.1', title: 'Scientific rigor and validity', control_id: 'CTRL-PROOF-VALIDITY', control_description: 'Formal proofs of billing and rate-limit invariants', test_file: 'tests/proofs/billing-invariants.test.ts', test_suite: 'billing-invariants', evidence_type: 'oversight', min_severity_level: 4, mutation_required: false },
  { requirement_id: 'NIST-RMF-MEASURE-2.6', framework: 'NIST AI RMF', article_or_section: 'MEASURE 2.6', title: 'Bias and fairness evaluation', control_id: 'CTRL-REPLAY-REJECTION', control_description: 'Replay attack rejection ensures no reuse of governance proofs', test_file: 'tests/failure/replay-matrix.test.ts', test_suite: 'replay-matrix', evidence_type: 'replay', min_severity_level: 3, mutation_required: true },
  { requirement_id: 'SLSA-L2-PROV', framework: 'SLSA', article_or_section: 'Level 2 — Provenance', title: 'Build provenance', control_id: 'CTRL-BUILD-PROVENANCE', control_description: 'Every build produces a signed, verifiable SLSA provenance', test_file: 'scripts/emit-test-evidence.mjs', test_suite: 'ci-provenance', evidence_type: 'provenance', min_severity_level: 5, mutation_required: false },
  { requirement_id: 'DSG-MIDMARKET-AUTOPILOT', framework: 'DSG Internal', article_or_section: 'Midmarket Autopilot Governance', title: 'Midmarket governance autopilot', control_id: 'CTRL-MIDMARKET-GATE', control_description: 'Midmarket governance autopilot runs without manual intervention', test_file: 'tests/dsg/midmarket-governance-autopilot.test.ts', test_suite: 'midmarket-governance-autopilot', evidence_type: 'integration', min_severity_level: 2, mutation_required: false },
];

// Load all evidence envelopes from the evidence directory
const evidenceMap = new Map();

if (fs.existsSync(evidenceDir)) {
  const files = fs.readdirSync(evidenceDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(evidenceDir, file), 'utf8');
      const env = JSON.parse(raw);
      if (env.schema_version === '1.0.0' && env.integrity?.chain_hash) {
        const key = file.replace(/^ccvs-/, '').replace(/-evidence\.json$/, '');
        evidenceMap.set(key, {
          hash: env.integrity.chain_hash,
          verified_at: env.generated_at,
          status: (env.metrics?.tests_failed ?? 0) === 0 ? 'pass' : 'fail',
        });
      }
    } catch (e) {
      console.warn('[compliance-matrix] Could not parse ' + file + ': ' + e.message);
    }
  }
}

// Also accept loose envelope files (e.g., ccvs-unit-evidence.json in root)
const rootEnvelopes = fs.readdirSync('.').filter(
  (f) => f.startsWith('ccvs-') && f.endsWith('-evidence.json'),
);
for (const file of rootEnvelopes) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const env = JSON.parse(raw);
    if (env.schema_version === '1.0.0' && env.integrity?.chain_hash) {
      const key = file.replace(/^ccvs-/, '').replace(/-evidence\.json$/, '');
      if (!evidenceMap.has(key)) {
        evidenceMap.set(key, {
          hash: env.integrity.chain_hash,
          verified_at: env.generated_at,
          status: (env.metrics?.tests_failed ?? 0) === 0 ? 'pass' : 'fail',
        });
      }
    }
  } catch {
    // skip
  }
}

// Build matrix rows
const rows = REQUIREMENT_CATALOG.map((req) => {
  const entry = evidenceMap.get(req.test_suite);
  return {
    ...req,
    evidence_hash: entry?.hash ?? null,
    status: entry?.status ?? 'not_verified',
    verified_at: entry?.verified_at ?? null,
  };
});

const pass = rows.filter((r) => r.status === 'pass').length;
const fail = rows.filter((r) => r.status === 'fail').length;
const pending = rows.filter((r) => r.status === 'pending').length;
const not_verified = rows.filter((r) => r.status === 'not_verified').length;

const claimPassEligible =
  fail === 0 &&
  not_verified === 0 &&
  rows.every((r) => r.status !== 'pass' || (r.evidence_hash?.startsWith('sha256:') ?? false));

const matrix = {
  schema_version: '1.0.0',
  generated_at: new Date().toISOString(),
  policy_version: policyVersion,
  rows,
  summary: { total: rows.length, pass, fail, pending, not_verified, claim_pass_eligible: claimPassEligible },
};

fs.writeFileSync(outputPath, JSON.stringify(matrix, null, 2));

console.log('[compliance-matrix] total=' + rows.length + ' pass=' + pass + ' fail=' + fail + ' not_verified=' + not_verified);
console.log('[compliance-matrix] claim_pass_eligible=' + claimPassEligible);
console.log('[compliance-matrix] written → ' + outputPath);

// Exit non-zero if any requirement fails
if (fail > 0) {
  process.exit(1);
}
