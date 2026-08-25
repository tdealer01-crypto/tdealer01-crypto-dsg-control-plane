import crypto from 'node:crypto';
import type { ImprovementCandidateEnvelope, PromotionGateResult } from './contracts';
import {
  PROMOTION_RECEIPT_SCHEMA_VERSION,
  type PromotionReceipt,
} from './post-deploy-control';

export type PromotionReceiptIssueResult =
  | { ok: true; receipt: PromotionReceipt }
  | { ok: false; reason: 'PROMOTION_NOT_ALLOWED' | 'PROMOTION_GATE_FAILURES_PRESENT' };

export function issuePromotionReceipt(
  envelope: ImprovementCandidateEnvelope,
  gate: PromotionGateResult,
): PromotionReceiptIssueResult {
  if (gate.verdict !== 'ALLOW') {
    return { ok: false, reason: 'PROMOTION_NOT_ALLOWED' };
  }
  if (gate.failures.length > 0) {
    return { ok: false, reason: 'PROMOTION_GATE_FAILURES_PRESENT' };
  }

  const canonical = {
    schemaVersion: PROMOTION_RECEIPT_SCHEMA_VERSION,
    targetRepository: envelope.targetRepository,
    candidateId: envelope.candidateId,
    goalId: envelope.goalId,
    approvedPlanHash: envelope.approvedPlanHash,
    baselineCommit: envelope.baselineCommit,
    candidateCommit: envelope.candidateCommit,
    cinemaProofId: envelope.cinemaProof?.proofId ?? null,
    cinemaProofHash: envelope.cinemaProof?.proofHash ?? null,
    gateEvaluatedAt: gate.evaluatedAt,
    metricDelta: gate.metricDelta,
  };

  const promotionHash = crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  const promotionId = `promotion-${promotionHash.slice(0, 24)}`;

  return {
    ok: true,
    receipt: {
      schemaVersion: PROMOTION_RECEIPT_SCHEMA_VERSION,
      promotionId,
      verdict: 'ALLOW',
      targetRepository: envelope.targetRepository,
      baselineCommit: envelope.baselineCommit,
      candidateCommit: envelope.candidateCommit,
      promotionHash,
      issuedBy: 'DSG_CONTROL_PLANE',
    },
  };
}
