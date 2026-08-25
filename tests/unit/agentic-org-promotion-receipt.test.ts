import { describe, expect, it } from 'vitest';
import { AGENTIC_ORG_SCHEMA_VERSION, type ImprovementCandidateEnvelope, type PromotionGateResult } from '../../lib/agent-governance/agentic-org/contracts';
import { issuePromotionReceipt } from '../../lib/agent-governance/agentic-org/promotion-receipt';

function envelope(): ImprovementCandidateEnvelope {
  return {
    schemaVersion: AGENTIC_ORG_SCHEMA_VERSION,
    candidateId: 'candidate-1',
    goalId: 'goal-1',
    approvedPlanHash: 'approved-plan-hash',
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
    evidence: [
      { kind: 'commit', uri: 'git://candidate', commitSha: 'b'.repeat(40) },
      { kind: 'metric', uri: 'artifact://metric', sha256: '1'.repeat(64), commitSha: 'b'.repeat(40) },
      { kind: 'test_output', uri: 'artifact://tests', sha256: '2'.repeat(64), commitSha: 'b'.repeat(40) },
      { kind: 'build_output', uri: 'artifact://build', sha256: '3'.repeat(64), commitSha: 'b'.repeat(40) },
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
  };
}

function gate(overrides: Partial<PromotionGateResult> = {}): PromotionGateResult {
  return {
    verdict: 'ALLOW',
    failures: [],
    metricDelta: 0.1,
    evaluatedAt: '2026-08-25T00:00:00.000Z',
    schemaVersion: AGENTIC_ORG_SCHEMA_VERSION,
    ...overrides,
  };
}

describe('issuePromotionReceipt', () => {
  it('mints a deterministic canonical receipt only for ALLOW', () => {
    const first = issuePromotionReceipt(envelope(), gate());
    const second = issuePromotionReceipt(envelope(), gate());
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.receipt).toEqual(second.receipt);
      expect(first.receipt.issuedBy).toBe('DSG_CONTROL_PLANE');
      expect(first.receipt.verdict).toBe('ALLOW');
      expect(first.receipt.promotionHash).toMatch(/^[0-9a-f]{64}$/);
      expect(first.receipt.promotionId).toMatch(/^promotion-[0-9a-f]{24}$/);
      expect(first.receipt.candidateCommit).toBe('b'.repeat(40));
    }
  });

  it('refuses to mint a receipt for BLOCK', () => {
    const result = issuePromotionReceipt(envelope(), gate({ verdict: 'BLOCK' }));
    expect(result).toEqual({ ok: false, reason: 'PROMOTION_NOT_ALLOWED' });
  });

  it('refuses an ALLOW object that still carries failures', () => {
    const result = issuePromotionReceipt(envelope(), gate({
      failures: [{ code: 'METRIC_REGRESSION', message: 'regression' }],
    }));
    expect(result).toEqual({ ok: false, reason: 'PROMOTION_GATE_FAILURES_PRESENT' });
  });
});
