import { describe, it, expect } from 'vitest';
import { buildComplianceMatrix, REQUIREMENT_CATALOG } from '../../../lib/ccvs/compliance-matrix';

describe('REQUIREMENT_CATALOG', () => {
  it('covers EU AI Act, ISO 42001, NIST AI RMF, and SLSA frameworks', () => {
    const frameworks = new Set(REQUIREMENT_CATALOG.map((r) => r.framework));
    expect(frameworks.has('EU AI Act')).toBe(true);
    expect(frameworks.has('ISO 42001')).toBe(true);
    expect(frameworks.has('NIST AI RMF')).toBe(true);
    expect(frameworks.has('SLSA')).toBe(true);
  });

  it('every entry has a unique requirement_id', () => {
    const ids = REQUIREMENT_CATALOG.map((r) => r.requirement_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry has a unique control_id', () => {
    const ids = REQUIREMENT_CATALOG.map((r) => r.control_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all severity levels are between 1 and 5', () => {
    for (const req of REQUIREMENT_CATALOG) {
      expect(req.min_severity_level).toBeGreaterThanOrEqual(1);
      expect(req.min_severity_level).toBeLessThanOrEqual(5);
    }
  });

  it('mutation_required is boolean on all entries', () => {
    for (const req of REQUIREMENT_CATALOG) {
      expect(typeof req.mutation_required).toBe('boolean');
    }
  });

  it('human oversight (EU-AI-ACT-ART14) requires mutation testing', () => {
    const entry = REQUIREMENT_CATALOG.find((r) => r.requirement_id === 'EU-AI-ACT-ART14');
    expect(entry?.mutation_required).toBe(true);
  });
});

describe('buildComplianceMatrix — empty evidence map', () => {
  it('all rows status=not_verified when evidence map is empty', () => {
    const matrix = buildComplianceMatrix(new Map());
    for (const row of matrix.rows) {
      expect(row.status).toBe('not_verified');
      expect(row.evidence_hash).toBeNull();
    }
  });

  it('claim_pass_eligible is false when rows are not verified', () => {
    const matrix = buildComplianceMatrix(new Map());
    expect(matrix.summary.claim_pass_eligible).toBe(false);
  });

  it('summary totals match catalog length', () => {
    const matrix = buildComplianceMatrix(new Map());
    expect(matrix.summary.total).toBe(REQUIREMENT_CATALOG.length);
    expect(matrix.summary.not_verified).toBe(REQUIREMENT_CATALOG.length);
    expect(matrix.summary.pass).toBe(0);
  });
});

describe('buildComplianceMatrix — with evidence', () => {
  it('marks a row as pass when evidence is present', () => {
    const evidenceMap = new Map([
      ['agent-command-gate', { hash: 'sha256:' + 'a'.repeat(64), verified_at: new Date().toISOString(), status: 'pass' as const }],
    ]);
    const matrix = buildComplianceMatrix(evidenceMap);
    const row = matrix.rows.find((r) => r.control_id === 'CTRL-HUMAN-GATE');
    expect(row?.status).toBe('pass');
    expect(row?.evidence_hash).toMatch(/^sha256:/);
  });

  it('marks a row as fail when status is fail', () => {
    const evidenceMap = new Map([
      ['audit-evidence', { hash: 'sha256:' + 'b'.repeat(64), verified_at: new Date().toISOString(), status: 'fail' as const }],
    ]);
    const matrix = buildComplianceMatrix(evidenceMap);
    const row = matrix.rows.find((r) => r.control_id === 'CTRL-IMMUTABLE-AUDIT');
    expect(row?.status).toBe('fail');
    expect(matrix.summary.fail).toBe(1);
  });

  it('claim_pass_eligible requires all rows pass with valid sha256 hash', () => {
    const allPassed = new Map<string, { hash: string; verified_at: string; status: 'pass' | 'fail' }>(
      REQUIREMENT_CATALOG.map((req) => [
        req.test_suite,
        { hash: 'sha256:' + 'c'.repeat(64), verified_at: new Date().toISOString(), status: 'pass' },
      ]),
    );
    const matrix = buildComplianceMatrix(allPassed);
    expect(matrix.summary.pass).toBe(REQUIREMENT_CATALOG.length);
    expect(matrix.summary.claim_pass_eligible).toBe(true);
  });

  it('claim_pass_eligible is false when any row has no sha256 prefix', () => {
    const allPassed = new Map<string, { hash: string; verified_at: string; status: 'pass' | 'fail' }>(
      REQUIREMENT_CATALOG.map((req) => [
        req.test_suite,
        { hash: 'nothash', verified_at: new Date().toISOString(), status: 'pass' },
      ]),
    );
    const matrix = buildComplianceMatrix(allPassed);
    expect(matrix.summary.claim_pass_eligible).toBe(false);
  });

  it('sets policy_version in the matrix', () => {
    const matrix = buildComplianceMatrix(new Map(), 'v2');
    expect(matrix.policy_version).toBe('v2');
  });

  it('generated_at is a valid ISO date', () => {
    const matrix = buildComplianceMatrix(new Map());
    expect(new Date(matrix.generated_at).toISOString()).toBe(matrix.generated_at);
  });
});
