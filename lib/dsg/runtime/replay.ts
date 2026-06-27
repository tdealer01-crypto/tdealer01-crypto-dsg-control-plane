import { sha256Json } from './hash';
import { verifyAuditHashChain, type AuditLedgerEntry } from './audit';
import { isEvidenceComplete, type EvidenceManifest } from './evidence';

export type ReplayProof = {
  replayHash: string;
  status: 'PASS' | 'BLOCK' | 'FAILED';
  errors: string[];
};

export function verifyReplay(input: {
  planHash: string;
  waveHash: string;
  evidenceManifest: EvidenceManifest;
  auditEntries: AuditLedgerEntry[];
}): ReplayProof {
  const errors: string[] = [];
  const audit = verifyAuditHashChain(input.auditEntries);
  if (!audit.ok) errors.push(...audit.errors);
  if (!isEvidenceComplete(input.evidenceManifest)) errors.push('EVIDENCE_MANIFEST_INCOMPLETE');
  if (!input.planHash.startsWith('sha256:')) errors.push('PLAN_HASH_INVALID');
  if (!input.waveHash.startsWith('sha256:')) errors.push('WAVE_HASH_INVALID');

  return {
    replayHash: sha256Json({
      planHash: input.planHash,
      waveHash: input.waveHash,
      manifestHash: input.evidenceManifest.manifestHash,
      auditHashes: input.auditEntries.map((entry) => entry.currentHash),
    }),
    status: errors.length === 0 ? 'PASS' : 'BLOCK',
    errors,
  };
}
