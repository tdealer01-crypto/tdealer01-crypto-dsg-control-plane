import { sha256Json } from './hash';
import type { DsgClaimGateInput, DsgClaimGateResult } from './claim-gate';
import { evaluateDsgClaimGate } from './claim-gate';

export type CompletionReport = {
  id: string;
  claim: DsgClaimGateResult;
  reportHash: string;
  evidenceManifestId?: string;
  auditExportId?: string;
  replayProofId?: string;
  deploymentProofId?: string;
  productionFlowProofId?: string;
  createdAt: string;
};

export function createCompletionReport(input: {
  id: string;
  gate: DsgClaimGateInput;
  evidenceManifestId?: string;
  auditExportId?: string;
  replayProofId?: string;
  deploymentProofId?: string;
  productionFlowProofId?: string;
  createdAt?: string;
}): CompletionReport {
  const claim = evaluateDsgClaimGate(input.gate);
  const createdAt = input.createdAt ?? new Date(0).toISOString();
  const payload = {
    id: input.id,
    claim,
    evidenceManifestId: input.evidenceManifestId,
    auditExportId: input.auditExportId,
    replayProofId: input.replayProofId,
    deploymentProofId: input.deploymentProofId,
    productionFlowProofId: input.productionFlowProofId,
    createdAt,
  };
  return { ...payload, reportHash: sha256Json(payload) };
}
