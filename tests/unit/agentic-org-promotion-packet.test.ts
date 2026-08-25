import { describe, expect, it } from 'vitest';
import {
  AGENTIC_ORG_SCHEMA_VERSION,
  type ImprovementCandidateEnvelope,
} from '../../lib/agent-governance/agentic-org/contracts';
import {
  bindCinemaEnvelopeProof,
  evaluatePromotionPacket,
  type CinemaEnvelopeBindingProof,
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
      { kind: 'metric', uri: 'artifact://metric.json', commitSha: 'b'.repeat(40) },
      { kind: 'test_output', uri: 'artifact://tests.txt', commitSha: 'b'.repeat(40) },
    ],
    candidateAuthority: 'SIMULATION_ONLY',
    promotionAuthority: 'DSG_CONTROL_PLANE',
    selfPromotionAllowed: false,
    requestedPromotion: 'PR',
  };
}

function proof(overrides: Partial<CinemaEnvelopeBindingProof> = {}): CinemaEnvelopeBindingProof {
  return {
    proofId: 'cinema-improvement-proofhash123456789012',
    proofHash: 'proofhash1234567890123456789012345678901234567890',
    verified: true,
    verification: 'VERIFIED_ENVELOPE_BINDING',
    boundCandidateCommit: 'b'.repeat(40),
    failures: [],
    evidenceKinds: ['commit', 'metric', 'test_output'],
    ...overrides,
  };
}

describe('Cinema promotion packet binding', () => {
  it('binds a matching verified Cinema proof and allows the existing promotion gate to evaluate it', () => {
    const result = evaluatePromotionPacket(candidate(), proof(), '2026-08-25T00:00:00.000Z');

    expect(result.binding.ok).toBe(true);
    expect(result.rawEvidenceVerified).toBe(false);
    expect(result.gate?.verdict).toBe('ALLOW');
    expect(result.gate?.failures).toEqual([]);
  });

  it('blocks an otherwise verified proof bound to another candidate commit', () => {
    const result = bindCinemaEnvelopeProof(candidate(), proof({ boundCandidateCommit: 'c'.repeat(40) }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failures.map((failure) => failure.code)).toContain('CINEMA_CANDIDATE_COMMIT_MISMATCH');
    }
  });

  it('blocks an unverified Cinema response before the promotion gate runs', () => {
    const result = evaluatePromotionPacket(candidate(), proof({ verified: false, verification: 'BLOCKED' }));

    expect(result.binding.ok).toBe(false);
    expect(result.gate).toBeNull();
  });

  it('blocks a response that claims verification while still carrying verifier failures', () => {
    const result = bindCinemaEnvelopeProof(candidate(), proof({ failures: ['EVIDENCE_COMMIT_MISMATCH:metric'] }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failures.map((failure) => failure.code)).toContain('CINEMA_PROOF_HAS_FAILURES');
    }
  });

  it('keeps raw evidence truth outside the structural binding claim', () => {
    const result = bindCinemaEnvelopeProof(candidate(), proof());

    expect(result.rawEvidenceVerified).toBe(false);
    expect(result.verificationLevel).toBe('VERIFIED_ENVELOPE_BINDING');
  });
});
