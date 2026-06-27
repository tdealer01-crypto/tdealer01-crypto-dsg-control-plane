import { sha256Json } from './hash';
import type { EvidenceItem } from './types';

export type EvidenceManifest = {
  id: string;
  evidenceIds: string[];
  manifestHash: string;
  status: 'DRAFT' | 'COMPLETE' | 'BLOCKED';
  createdBy: string;
  createdAt: string;
};

export function createEvidenceManifest(input: {
  id: string;
  evidence: EvidenceItem[];
  createdBy: string;
  createdAt?: string;
}): EvidenceManifest {
  const evidenceIds = input.evidence.map((item) => item.id).sort();
  const contentHashes = input.evidence.map((item) => item.contentHash).sort();
  const allHashesValid = contentHashes.every((hash) => /^sha256:[a-f0-9]{64}$/.test(hash));

  return {
    id: input.id,
    evidenceIds,
    status: input.evidence.length > 0 && allHashesValid ? 'COMPLETE' : 'BLOCKED',
    createdBy: input.createdBy,
    createdAt: input.createdAt ?? new Date(0).toISOString(),
    manifestHash: sha256Json({ evidenceIds, contentHashes }),
  };
}

export function isEvidenceComplete(manifest: EvidenceManifest): boolean {
  return manifest.status === 'COMPLETE' && manifest.evidenceIds.length > 0;
}
