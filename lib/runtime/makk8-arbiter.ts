import { createHash } from 'node:crypto';

export const MAKK8_VERSION = 'V159-DHAMMA-INTEGRITY';
export const MAKK8_INVARIANT_SET = 'MAKK-8-LOGIC-v1.0';

export type Makk8ActionData = {
  value?: number;
  is_grounded?: boolean;
  intent_score?: number;
  is_api_clean?: boolean;
  source_verified?: boolean;
  compute_cost?: number;
  has_audit_trail?: boolean;
  nonce_lock?: boolean;
};

export type Makk8InvariantSnapshot = {
  rightView: boolean;
  rightResolve: boolean;
  rightSpeech: boolean;
  rightConduct: boolean;
  rightLivelihood: boolean;
  rightEffort: boolean;
  rightMindfulness: boolean;
  rightSamadhi: boolean;
};

export type Makk8VerificationResult = {
  ok: boolean;
  reason: 'SAMMA' | 'PATH_CONFLICT';
  artifact: Makk8InvariantSnapshot;
};

export class Makk8Arbiter {
  verifyPathIntegrity(actionData: Makk8ActionData): Makk8VerificationResult {
    const artifact: Makk8InvariantSnapshot = {
      rightView: Boolean(actionData.is_grounded),
      rightResolve: Number(actionData.intent_score || 0) > 0,
      rightSpeech: Boolean(actionData.is_api_clean),
      rightConduct: Number(actionData.value || 0) >= 0,
      rightLivelihood: Boolean(actionData.source_verified),
      rightEffort: Number(actionData.compute_cost || 0) < 1000,
      rightMindfulness: Boolean(actionData.has_audit_trail),
      rightSamadhi: Boolean(actionData.nonce_lock),
    };

    const ok = Object.values(artifact).every(Boolean);
    return {
      ok,
      reason: ok ? 'SAMMA' : 'PATH_CONFLICT',
      artifact,
    };
  }
}

export function buildDhammaProofHash(artifact: Makk8InvariantSnapshot, value: number): string {
  const payload = JSON.stringify({ artifact, value, invariantSet: MAKK8_INVARIANT_SET });
  return createHash('sha256').update(payload).digest('hex');
}

export function signDhammaProof(proofHash: string, serverKey: string): string {
  return createHash('sha256').update(`${proofHash}|${MAKK8_INVARIANT_SET}|${serverKey}`).digest('hex');
}
