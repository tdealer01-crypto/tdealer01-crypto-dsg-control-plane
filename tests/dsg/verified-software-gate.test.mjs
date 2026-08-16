import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { evaluateSoftwareEvidence, SOFTWARE_EVIDENCE_SCHEMA } from '../../scripts/verified-software-gate.mjs';

const hash = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`;

function passingEvidence(overrides = {}) {
  return {
    schema: SOFTWARE_EVIDENCE_SCHEMA,
    commit: 'abcdef1234567890',
    findings: { open: 0, repaired: 2 },
    repair: { status: 'REPAIRED', attempts: 2, maxAttempts: 5 },
    stages: {
      scan: { status: 'PASS', provenance: 'STATICALLY_VERIFIED', evidenceHash: hash('scan') },
      typecheck: { status: 'PASS', provenance: 'MEASURED', evidenceHash: hash('typecheck') },
      unit: { status: 'PASS', provenance: 'MEASURED', evidenceHash: hash('unit') },
      build: { status: 'PASS', provenance: 'MEASURED', evidenceHash: hash('build') },
      security: { status: 'PASS', provenance: 'STATICALLY_VERIFIED', evidenceHash: hash('security') },
      benchmark: { status: 'PASS', required: true, provenance: 'MEASURED', evidenceHash: hash('benchmark') },
    },
    ...overrides,
  };
}

describe('verified software pre-release gate', () => {
  it('returns READY_FOR_DSG_GATE but never production ALLOW', () => {
    const result = evaluateSoftwareEvidence(passingEvidence());
    expect(result.status).toBe('READY_FOR_DSG_GATE');
    expect(result.productionAllowed).toBe(false);
    expect(result.humanReleaseRequired).toBe(true);
    expect(result.capacityClaimAllowed).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it('blocks when a required validation fails', () => {
    const evidence = passingEvidence();
    evidence.stages.unit.status = 'FAIL';
    const result = evaluateSoftwareEvidence(evidence);
    expect(result.status).toBe('BLOCK');
    expect(result.blockers).toContain('UNIT_NOT_PASS');
  });

  it('blocks unresolved findings', () => {
    const result = evaluateSoftwareEvidence(passingEvidence({ findings: { open: 1, repaired: 1 } }));
    expect(result.status).toBe('BLOCK');
    expect(result.blockers).toContain('UNRESOLVED_FINDINGS:1');
  });

  it('blocks a repair loop that exhausted its bound', () => {
    const result = evaluateSoftwareEvidence(passingEvidence({
      repair: { status: 'FAILED', attempts: 6, maxAttempts: 5 },
    }));
    expect(result.status).toBe('BLOCK');
    expect(result.blockers).toContain('REPAIR_ATTEMPTS_EXCEEDED');
    expect(result.blockers).toContain('REPAIR_NOT_VERIFIED:FAILED');
  });

  it('does not allow a measured capacity claim from estimated benchmark evidence', () => {
    const evidence = passingEvidence();
    evidence.stages.benchmark.provenance = 'ESTIMATED';
    const result = evaluateSoftwareEvidence(evidence);
    expect(result.status).toBe('BLOCK');
    expect(result.capacityClaimAllowed).toBe(false);
    expect(result.blockers).toContain('BENCHMARK_PROVENANCE_NOT_VERIFIED');
  });

  it('produces the same evidence bundle hash for the same logical input', () => {
    const first = evaluateSoftwareEvidence(passingEvidence());
    const second = evaluateSoftwareEvidence(passingEvidence());
    expect(first.evidenceBundleHash).toBe(second.evidenceBundleHash);
  });
});
