import { createAuditLedgerEntry, type AuditLedgerEntry } from './audit';
import { sha256Json } from './hash';
import type { EvidenceItem } from './types';
import type { GatewayProofDecision } from './gateway-proof-bridge';

export type GatewayProofEvidenceBundle = {
  evidence: EvidenceItem;
  auditEntry: AuditLedgerEntry;
  replayHash: string;
};

export function bindGatewayProofEvidence(input: {
  jobId: string;
  actorId: string;
  gatewayProof: GatewayProofDecision;
  previousAuditHash?: string;
  createdAt?: string;
}): GatewayProofEvidenceBundle {
  const p = input.gatewayProof;
  if (!p.smt2 || !p.smt2Hash || !p.resultHash) throw new Error('DSG_GATEWAY_PROOF_INCOMPLETE');

  const evidencePayload = {
    jobId: input.jobId,
    policyVersion: p.policyVersion,
    sourceRepo: p.sourceRepo,
    sourceRef: p.sourceRef,
    smt2: p.smt2,
    smt2Hash: p.smt2Hash,
    resultHash: p.resultHash,
    decision: p.decision,
    violated: p.violated,
  };

  const evidence: EvidenceItem = {
    id: `gateway-proof:${input.jobId}`,
    evidenceType: 'gateway_proof',
    summary: `Gateway proof ${p.decision}`,
    contentHash: sha256Json(evidencePayload),
  };

  const auditEntry = createAuditLedgerEntry({
    id: `audit:gateway-proof:${input.jobId}`,
    previousHash: input.previousAuditHash,
    actorId: input.actorId,
    action: 'RUNTIME_GATEWAY_PROOF_BIND',
    decision: p.decision,
    evidenceIds: [evidence.id],
    payload: evidencePayload,
    createdAt: input.createdAt,
  });

  return { evidence, auditEntry, replayHash: sha256Json({ evidence: evidence.contentHash, audit: auditEntry.currentHash, resultHash: p.resultHash }) };
}
