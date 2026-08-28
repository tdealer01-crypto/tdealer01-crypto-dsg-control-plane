import type { ImprovementCandidateEnvelope, PromotionGateResult } from './contracts';
import { evaluatePromotionCandidate } from './promotion-gate';
import { issuePromotionReceipt } from './promotion-receipt';
import type { PromotionReceipt } from './post-deploy-control';

export interface CinemaEnvelopeBindingProof {
  proofId: string;
  proofHash: string;
  verified: boolean;
  verification: 'VERIFIED_ENVELOPE_BINDING' | 'BLOCKED';
  boundCandidateCommit: string;
  failures: string[];
  evidenceKinds: string[];
}

export interface CinemaRawEvidenceProof {
  proofId: string;
  proofHash: string;
  verified: boolean;
  verification: 'VERIFIED_RAW_EVIDENCE' | 'BLOCKED';
  rawEvidenceVerified: boolean;
  boundCandidateCommit: string;
  structuralProofId: string;
  structuralProofHash: string;
  failures: string[];
  artifactDigests: Record<string, string>;
}

export type CinemaBindingFailureCode =
  | 'CINEMA_PROOF_ID_MISSING'
  | 'CINEMA_PROOF_HASH_MISSING'
  | 'CINEMA_PROOF_NOT_VERIFIED'
  | 'CINEMA_VERIFICATION_LEVEL_INVALID'
  | 'CINEMA_PROOF_HAS_FAILURES'
  | 'CINEMA_CANDIDATE_COMMIT_MISMATCH'
  | 'CINEMA_RAW_EVIDENCE_NOT_VERIFIED'
  | 'CINEMA_RAW_ARTIFACT_DIGESTS_INCOMPLETE'
  | 'CINEMA_RAW_ARTIFACT_DIGEST_MISMATCH';

export interface CinemaBindingFailure {
  code: CinemaBindingFailureCode;
  message: string;
}

export type CinemaBindingResult =
  | {
      ok: true;
      verificationLevel: 'VERIFIED_ENVELOPE_BINDING';
      proof: CinemaEnvelopeBindingProof;
      rawEvidenceVerified: false;
    }
  | {
      ok: false;
      failures: CinemaBindingFailure[];
      verificationLevel: 'BLOCKED';
      rawEvidenceVerified: false;
    };

export type CinemaRawBindingResult =
  | {
      ok: true;
      envelope: ImprovementCandidateEnvelope;
      verificationLevel: 'VERIFIED_RAW_EVIDENCE';
      rawEvidenceVerified: true;
    }
  | {
      ok: false;
      failures: CinemaBindingFailure[];
      verificationLevel: 'BLOCKED';
      rawEvidenceVerified: false;
    };

export interface PromotionPacketResult {
  structuralBinding: CinemaBindingResult;
  rawBinding: CinemaRawBindingResult | null;
  gate: PromotionGateResult | null;
  receipt: PromotionReceipt | null;
  rawEvidenceVerified: boolean;
}

function baseProofFailures(
  proof: { proofId: string; proofHash: string; verified: boolean; failures: string[]; boundCandidateCommit: string },
  candidateCommit: string,
): CinemaBindingFailure[] {
  const failures: CinemaBindingFailure[] = [];
  if (!proof.proofId.trim()) {
    failures.push({ code: 'CINEMA_PROOF_ID_MISSING', message: 'Cinema proof id is required.' });
  }
  if (!proof.proofHash.trim()) {
    failures.push({ code: 'CINEMA_PROOF_HASH_MISSING', message: 'Cinema proof hash is required.' });
  }
  if (!proof.verified) {
    failures.push({ code: 'CINEMA_PROOF_NOT_VERIFIED', message: 'Cinema did not verify this proof stage.' });
  }
  if (proof.failures.length > 0) {
    failures.push({ code: 'CINEMA_PROOF_HAS_FAILURES', message: 'A Cinema proof containing verifier failures cannot be attached.' });
  }
  if (proof.boundCandidateCommit !== candidateCommit) {
    failures.push({ code: 'CINEMA_CANDIDATE_COMMIT_MISMATCH', message: 'Cinema proof is bound to a different candidate commit.' });
  }
  return failures;
}

export function bindCinemaEnvelopeProof(
  envelope: Omit<ImprovementCandidateEnvelope, 'cinemaProof'>,
  proof: CinemaEnvelopeBindingProof,
): CinemaBindingResult {
  const failures = baseProofFailures(proof, envelope.candidateCommit);
  if (proof.verification !== 'VERIFIED_ENVELOPE_BINDING') {
    failures.push({
      code: 'CINEMA_VERIFICATION_LEVEL_INVALID',
      message: 'Structural stage requires VERIFIED_ENVELOPE_BINDING.',
    });
  }
  if (failures.length > 0) {
    return { ok: false, failures, verificationLevel: 'BLOCKED', rawEvidenceVerified: false };
  }
  return {
    ok: true,
    proof,
    verificationLevel: 'VERIFIED_ENVELOPE_BINDING',
    rawEvidenceVerified: false,
  };
}

export function bindCinemaRawEvidenceProof(
  envelope: Omit<ImprovementCandidateEnvelope, 'cinemaProof'>,
  proof: CinemaRawEvidenceProof,
): CinemaRawBindingResult {
  const failures = baseProofFailures(proof, envelope.candidateCommit);
  if (proof.verification !== 'VERIFIED_RAW_EVIDENCE') {
    failures.push({
      code: 'CINEMA_VERIFICATION_LEVEL_INVALID',
      message: 'Promotion stage requires VERIFIED_RAW_EVIDENCE.',
    });
  }
  if (proof.rawEvidenceVerified !== true) {
    failures.push({
      code: 'CINEMA_RAW_EVIDENCE_NOT_VERIFIED',
      message: 'Cinema did not verify the raw evidence bytes.',
    });
  }

  const requiredDigests = ['metric', 'test_output', 'build_output'] as const;
  for (const kind of requiredDigests) {
    const proofDigest = proof.artifactDigests[kind];
    const envelopeEvidence = envelope.evidence.find((item) => item.kind === kind);
    const envelopeDigest = envelopeEvidence?.sha256;

    if (!proofDigest || !envelopeDigest) {
      failures.push({
        code: 'CINEMA_RAW_ARTIFACT_DIGESTS_INCOMPLETE',
        message: `Raw ${kind} digest must exist in both the Cinema proof and canonical envelope evidence.`,
      });
      continue;
    }

    if (proofDigest !== envelopeDigest) {
      failures.push({
        code: 'CINEMA_RAW_ARTIFACT_DIGEST_MISMATCH',
        message: `Cinema ${kind} digest does not match the canonical envelope evidence digest.`,
      });
    }
  }

  if (failures.length > 0) {
    return { ok: false, failures, verificationLevel: 'BLOCKED', rawEvidenceVerified: false };
  }
  return {
    ok: true,
    envelope: {
      ...envelope,
      cinemaProof: {
        proofId: proof.proofId,
        proofHash: proof.proofHash,
        verified: true,
        verification: 'VERIFIED_RAW_EVIDENCE',
        rawEvidenceVerified: true,
        boundCandidateCommit: proof.boundCandidateCommit,
      },
    },
    verificationLevel: 'VERIFIED_RAW_EVIDENCE',
    rawEvidenceVerified: true,
  };
}

export function evaluatePromotionPacket(
  envelope: Omit<ImprovementCandidateEnvelope, 'cinemaProof'>,
  proof: CinemaEnvelopeBindingProof,
): PromotionPacketResult {
  const structuralBinding = bindCinemaEnvelopeProof(envelope, proof);
  return {
    structuralBinding,
    rawBinding: null,
    gate: null,
    receipt: null,
    rawEvidenceVerified: false,
  };
}

export function evaluateRawPromotionPacket(
  envelope: Omit<ImprovementCandidateEnvelope, 'cinemaProof'>,
  structuralProof: CinemaEnvelopeBindingProof,
  rawProof: CinemaRawEvidenceProof,
  evaluatedAt?: string,
): PromotionPacketResult {
  const structuralBinding = bindCinemaEnvelopeProof(envelope, structuralProof);
  if (!structuralBinding.ok) {
    return { structuralBinding, rawBinding: null, gate: null, receipt: null, rawEvidenceVerified: false };
  }

  if (
    rawProof.structuralProofId !== structuralProof.proofId ||
    rawProof.structuralProofHash !== structuralProof.proofHash
  ) {
    const rawBinding: CinemaRawBindingResult = {
      ok: false,
      failures: [{
        code: 'CINEMA_VERIFICATION_LEVEL_INVALID',
        message: 'Raw proof is not chained to the accepted structural proof.',
      }],
      verificationLevel: 'BLOCKED',
      rawEvidenceVerified: false,
    };
    return { structuralBinding, rawBinding, gate: null, receipt: null, rawEvidenceVerified: false };
  }

  const rawBinding = bindCinemaRawEvidenceProof(envelope, rawProof);
  if (!rawBinding.ok) {
    return { structuralBinding, rawBinding, gate: null, receipt: null, rawEvidenceVerified: false };
  }

  const gate = evaluatePromotionCandidate(rawBinding.envelope, evaluatedAt);
  const issued = issuePromotionReceipt(rawBinding.envelope, gate);
  return {
    structuralBinding,
    rawBinding,
    gate,
    receipt: issued.ok ? issued.receipt : null,
    rawEvidenceVerified: true,
  };
}
