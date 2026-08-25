import { describe, expect, it } from 'vitest';
import {
  AGENTIC_ORG_SCHEMA_VERSION,
  type ImprovementCandidateEnvelope,
} from '../../lib/agent-governance/agentic-org/contracts';
import {
  bindCinemaEnvelopeProof,
  bindCinemaRawEvidenceProof,
  evaluatePromotionPacket,
  evaluateRawPromotionPacket,
  type CinemaEnvelopeBindingProof,
  type CinemaRawEvidenceProof,
} from '../../lib/agent-governance/agentic-org/promotion-packet';

function candidate(): Omit<ImprovementCandidateEnvelope, 'cinemaProof'> {
  return {
    schemaVersion: AGENTIC_ORG_SCHEMA_VERSION,
    candidateId: 'candidate-1',
    goalId: 'goal-1',
    approvedPlanHash: 'plan-hash',
    targetRepository: 'tdealer01-crypto/dsg-agi-simulation',
    baselineCommit: 'a'.repeat(40),
    candidateCommit: 'b'.repeat(40),
    allowedPaths: ['data/simulation-input.json'],
    baselineMetric: { name: 'fitness_composite', value: 0.8, direction: 'HIGHER_IS_BETTER' },
    candidateMetric: { name: 'fitness_composite', value: 0.9, direction: 'HIGHER_IS_BETTER' },
    constraintsPassed: true,
    planAligned: true,
    testsPassed: true,
    buildPassed: true,
    simulationHash: 'simulation-hash',
    evidence: [
      { kind: 'commit', uri: 'git://candidate', commitSha: 'b'.repeat(40) },
      { kind: 'metric', uri: 'artifact://metric.json', sha256: '1'.repeat(64), commitSha: 'b'.repeat(40) },
      { kind: 'test_output', uri: 'artifact://tests.txt', sha256: '2'.repeat(64), commitSha: 'b'.repeat(40) },
      { kind: 'build_output', uri: 'artifact://build.txt', sha256: '3'.repeat(64), commitSha: 'b'.repeat(40) },
    ],
    candidateAuthority: 'SIMULATION_ONLY',
    promotionAuthority: 'DSG_CONTROL_PLANE',
    selfPromotionAllowed: false,
    requestedPromotion: 'PR',
  };
}

function structuralProof(overrides: Partial<CinemaEnvelopeBindingProof> = {}): CinemaEnvelopeBindingProof {
  return {
    proofId: 'cinema-structural-proof',
    proofHash: 'structural-proof-hash',
    verified: true,
    verification: 'VERIFIED_ENVELOPE_BINDING',
    boundCandidateCommit: 'b'.repeat(40),
    failures: [],
    evidenceKinds: ['commit', 'metric', 'test_output', 'build_output'],
    ...overrides,
  };
}

function rawProof(overrides: Partial<CinemaRawEvidenceProof> = {}): CinemaRawEvidenceProof {
  return {
    proofId: 'cinema-raw-proof',
    proofHash: 'raw-proof-hash',
    verified: true,
    verification: 'VERIFIED_RAW_EVIDENCE',
    rawEvidenceVerified: true,
    boundCandidateCommit: 'b'.repeat(40),
    structuralProofId: 'cinema-structural-proof',
    structuralProofHash: 'structural-proof-hash',
    failures: [],
    artifactDigests: {
      metric: '1'.repeat(64),
      test_output: '2'.repeat(64),
      build_output: '3'.repeat(64),
    },
    ...overrides,
  };
}

describe('Cinema promotion packet binding', () => {
  it('keeps structural proof as an intermediate stage with no promotion gate verdict', () => {
    const result = evaluatePromotionPacket(candidate(), structuralProof());
    expect(result.structuralBinding.ok).toBe(true);
    expect(result.rawEvidenceVerified).toBe(false);
    expect(result.rawBinding).toBeNull();
    expect(result.gate).toBeNull();
  });

  it('allows the promotion gate to run only after a chained raw evidence proof', () => {
    const result = evaluateRawPromotionPacket(
      candidate(),
      structuralProof(),
      rawProof(),
      '2026-08-25T00:00:00.000Z',
    );
    expect(result.structuralBinding.ok).toBe(true);
    expect(result.rawBinding?.ok).toBe(true);
    expect(result.rawEvidenceVerified).toBe(true);
    expect(result.gate?.verdict).toBe('ALLOW');
    expect(result.gate?.failures).toEqual([]);
  });

  it('blocks an otherwise verified structural proof bound to another candidate commit', () => {
    const result = bindCinemaEnvelopeProof(candidate(), structuralProof({ boundCandidateCommit: 'c'.repeat(40) }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failures.map((failure) => failure.code)).toContain('CINEMA_CANDIDATE_COMMIT_MISMATCH');
    }
  });

  it('blocks raw proof that is not chained to the accepted structural proof', () => {
    const result = evaluateRawPromotionPacket(
      candidate(),
      structuralProof(),
      rawProof({ structuralProofHash: 'different-structural-hash' }),
    );
    expect(result.rawEvidenceVerified).toBe(false);
    expect(result.gate).toBeNull();
    expect(result.rawBinding?.ok).toBe(false);
  });

  it('blocks raw proof with incomplete artifact digests', () => {
    const result = bindCinemaRawEvidenceProof(candidate(), rawProof({ artifactDigests: { metric: '1'.repeat(64) } }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failures.map((failure) => failure.code)).toContain('CINEMA_RAW_ARTIFACT_DIGESTS_INCOMPLETE');
    }
  });

  it('blocks a response that claims raw verification while still carrying verifier failures', () => {
    const result = bindCinemaRawEvidenceProof(candidate(), rawProof({ failures: ['RAW_ARTIFACT_DIGEST_MISMATCH:metric'] }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failures.map((failure) => failure.code)).toContain('CINEMA_PROOF_HAS_FAILURES');
    }
  });
});
