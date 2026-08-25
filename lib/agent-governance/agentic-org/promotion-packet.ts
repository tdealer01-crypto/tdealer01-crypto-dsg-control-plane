import type { ImprovementCandidateEnvelope, PromotionGateResult } from './contracts';
import { evaluatePromotionCandidate } from './promotion-gate';

export interface CinemaEnvelopeBindingProof {
  proofId: string;
  proofHash: string;
  verified: boolean;
  verification: 'VERIFIED_ENVELOPE_BINDING' | 'BLOCKED';
  boundCandidateCommit: string;
  failures: string[];
  evidenceKinds: string[];
}

export type CinemaBindingFailureCode =
  | 'CINEMA_PROOF_ID_MISSING'
  | 'CINEMA_PROOF_HASH_MISSING'
  | 'CINEMA_PROOF_NOT_VERIFIED'
  | 'CINEMA_VERIFICATION_LEVEL_INVALID'
  | 'CINEMA_PROOF_HAS_FAILURES'
  | 'CINEMA_CANDIDATE_COMMIT_MISMATCH';

export interface CinemaBindingFailure {
  code: CinemaBindingFailureCode;
  message: string;
}

export type CinemaBindingResult =
  | {
      ok: true;
      envelope: ImprovementCandidateEnvelope;
      verificationLevel: 'VERIFIED_ENVELOPE_BINDING';
      rawEvidenceVerified: false;
    }
  | {
      ok: false;
      failures: CinemaBindingFailure[];
      verificationLevel: 'BLOCKED';
      rawEvidenceVerified: false;
    };

export interface PromotionPacketResult {
  binding: CinemaBindingResult;
  gate: PromotionGateResult | null;
  rawEvidenceVerified: false;
}

export function bindCinemaEnvelopeProof(
  envelope: Omit<ImprovementCandidateEnvelope, 'cinemaProof'>,
  proof: CinemaEnvelopeBindingProof,
): CinemaBindingResult {
  const failures: CinemaBindingFailure[] = [];

  if (!proof.proofId.trim()) {
    failures.push({ code: 'CINEMA_PROOF_ID_MISSING', message: 'Cinema proof id is required.' });
  }
  if (!proof.proofHash.trim()) {
    failures.push({ code: 'CINEMA_PROOF_HASH_MISSING', message: 'Cinema proof hash is required.' });
  }
  if (!proof.verified) {
    failures.push({ code: 'CINEMA_PROOF_NOT_VERIFIED', message: 'Cinema did not verify the envelope binding.' });
  }
  if (proof.verification !== 'VERIFIED_ENVELOPE_BINDING') {
    failures.push({
      code: 'CINEMA_VERIFICATION_LEVEL_INVALID',
      message: 'Only VERIFIED_ENVELOPE_BINDING can be attached at this promotion stage.',
    });
  }
  if (proof.failures.length > 0) {
    failures.push({
      code: 'CINEMA_PROOF_HAS_FAILURES',
      message: 'A Cinema proof containing verifier failures cannot be attached.',
    });
  }
  if (proof.boundCandidateCommit !== envelope.candidateCommit) {
    failures.push({
      code: 'CINEMA_CANDIDATE_COMMIT_MISMATCH',
      message: 'Cinema proof is bound to a different candidate commit.',
    });
  }

  if (failures.length > 0) {
    return {
      ok: false,
      failures,
      verificationLevel: 'BLOCKED',
      rawEvidenceVerified: false,
    };
  }

  return {
    ok: true,
    envelope: {
      ...envelope,
      cinemaProof: {
        proofId: proof.proofId,
        proofHash: proof.proofHash,
        verified: true,
        boundCandidateCommit: proof.boundCandidateCommit,
      },
    },
    verificationLevel: 'VERIFIED_ENVELOPE_BINDING',
    rawEvidenceVerified: false,
  };
}

export function evaluatePromotionPacket(
  envelope: Omit<ImprovementCandidateEnvelope, 'cinemaProof'>,
  proof: CinemaEnvelopeBindingProof,
  evaluatedAt?: string,
): PromotionPacketResult {
  const binding = bindCinemaEnvelopeProof(envelope, proof);
  if (!binding.ok) {
    return { binding, gate: null, rawEvidenceVerified: false };
  }

  return {
    binding,
    gate: evaluatePromotionCandidate(binding.envelope, evaluatedAt),
    rawEvidenceVerified: false,
  };
}
