import { describe, expect, it } from 'vitest';
import { AGENTIC_ORG_SCHEMA_VERSION, type ImprovementCandidateEnvelope } from '../../lib/agent-governance/agentic-org/contracts';
import { evaluatePromotionCandidate } from '../../lib/agent-governance/agentic-org/promotion-gate';

function candidate(overrides: Partial<ImprovementCandidateEnvelope> = {}): ImprovementCandidateEnvelope {
  return {
    schemaVersion: AGENTIC_ORG_SCHEMA_VERSION,
    candidateId: 'cand-1',
    goalId: 'goal-1',
    approvedPlanHash: 'plan-hash',
    targetRepository: 'tdealer01-crypto/dsg-one-v1',
    baselineCommit: 'a'.repeat(40),
    candidateCommit: 'b'.repeat(40),
    allowedPaths: ['lib/dsg/app-builder/**'],
    baselineMetric: { name: 'success_rate', value: 0.8, direction: 'HIGHER_IS_BETTER' },
    candidateMetric: { name: 'success_rate', value: 0.9, direction: 'HIGHER_IS_BETTER' },
    constraintsPassed: true,
    planAligned: true,
    testsPassed: true,
    buildPassed: true,
    evidence: [
      { kind: 'commit', uri: 'git://candidate', commitSha: 'b'.repeat(40) },
      { kind: 'metric', uri: 'artifact://metric.json', sha256: '1'.repeat(64), commitSha: 'b'.repeat(40) },
      { kind: 'test_output', uri: 'artifact://tests.txt', sha256: '2'.repeat(64), commitSha: 'b'.repeat(40) },
      { kind: 'build_output', uri: 'artifact://build.txt', sha256: '3'.repeat(64), commitSha: 'b'.repeat(40) },
    ],
    candidateAuthority: 'SIMULATION_ONLY',
    promotionAuthority: 'DSG_CONTROL_PLANE',
    selfPromotionAllowed: false,
    cinemaProof: {
      proofId: 'proof-1',
      proofHash: 'proof-hash',
      verified: true,
      verification: 'VERIFIED_RAW_EVIDENCE',
      rawEvidenceVerified: true,
      boundCandidateCommit: 'b'.repeat(40),
    },
    requestedPromotion: 'PR',
    ...overrides,
  };
}

describe('evaluatePromotionCandidate', () => {
  it('allows only a plan-aligned improvement with independently verified raw evidence', () => {
    const result = evaluatePromotionCandidate(candidate(), '2026-08-25T00:00:00.000Z');
    expect(result.verdict).toBe('ALLOW');
    expect(result.failures).toEqual([]);
    expect(result.metricDelta).toBeCloseTo(0.1);
  });

  it('blocks structural Cinema binding that has not verified raw evidence', () => {
    const result = evaluatePromotionCandidate(candidate({
      cinemaProof: {
        proofId: 'structural-proof',
        proofHash: 'structural-hash',
        verified: true,
        verification: 'VERIFIED_ENVELOPE_BINDING',
        rawEvidenceVerified: false,
        boundCandidateCommit: 'b'.repeat(40),
      },
    }));
    expect(result.verdict).toBe('BLOCK');
    expect(result.failures.map((failure) => failure.code)).toContain('CINEMA_RAW_EVIDENCE_REQUIRED');
  });

  it('blocks metric regression even when every other gate passes', () => {
    const result = evaluatePromotionCandidate(candidate({
      candidateMetric: { name: 'success_rate', value: 0.7, direction: 'HIGHER_IS_BETTER' },
    }));
    expect(result.verdict).toBe('BLOCK');
    expect(result.failures.map((failure) => failure.code)).toContain('METRIC_REGRESSION');
  });

  it('blocks a Cinema proof bound to another commit', () => {
    const result = evaluatePromotionCandidate(candidate({
      cinemaProof: {
        proofId: 'proof-1',
        proofHash: 'proof-hash',
        verified: true,
        verification: 'VERIFIED_RAW_EVIDENCE',
        rawEvidenceVerified: true,
        boundCandidateCommit: 'c'.repeat(40),
      },
    }));
    expect(result.verdict).toBe('BLOCK');
    expect(result.failures.map((failure) => failure.code)).toContain('CINEMA_COMMIT_MISMATCH');
  });

  it('blocks incomplete evidence including a missing build artifact', () => {
    const result = evaluatePromotionCandidate(candidate({
      evidence: [
        { kind: 'commit', uri: 'git://candidate' },
        { kind: 'metric', uri: 'artifact://metric.json' },
        { kind: 'test_output', uri: 'artifact://tests.txt' },
      ],
    }));
    expect(result.verdict).toBe('BLOCK');
    expect(result.failures.map((failure) => failure.code)).toContain('EVIDENCE_INCOMPLETE');
  });

  it('blocks any candidate that claims promotion authority', () => {
    const forged = candidate() as ImprovementCandidateEnvelope & {
      candidateAuthority: string;
      promotionAuthority: string;
      selfPromotionAllowed: boolean;
    };
    forged.candidateAuthority = 'PROMOTION_AUTHORITY';
    forged.promotionAuthority = 'SIMULATION';
    forged.selfPromotionAllowed = true;

    const result = evaluatePromotionCandidate(forged as ImprovementCandidateEnvelope);
    expect(result.verdict).toBe('BLOCK');
    expect(result.failures.map((failure) => failure.code)).toContain('SELF_PROMOTION_AUTHORITY_INVALID');
  });
});
