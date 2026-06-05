import { createHash } from 'node:crypto';

export type DsgAgentTruthStatus = 'verified' | 'pending_verification' | 'blocked' | 'review';

export type DsgAgentVerifiedData<T> = {
  raw: T;
  verified: boolean;
  status: DsgAgentTruthStatus;
  evidence: string[];
  hash: string;
};

export type DsgAgentTargetLock = {
  attention: string;
  target: string;
  state: 'target_locked';
};

export type DsgAgentRiskState = {
  inputSummary: string;
  risk: 'low' | 'react_before_verify' | 'secret_or_claim_risk';
  state: 'data_verified' | 'kilesa_active' | 'blocked';
  reasons: string[];
};

export type DsgAgentParamiStats = {
  type: 'accumulated_statistics';
  stats: Record<string, number>;
};

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function verify<T>(data: T, evidence: string[] = []): DsgAgentVerifiedData<T> {
  const serialized = JSON.stringify(data);
  const verified = evidence.length > 0;
  return {
    raw: data,
    verified,
    status: verified ? 'verified' : 'pending_verification',
    evidence,
    hash: sha256(serialized),
  };
}

export function samadhi(attention: string, target: string): DsgAgentTargetLock {
  return { attention, target, state: 'target_locked' };
}

export function kilesa(inputSummary: string, verified = false, riskFlags: string[] = []): DsgAgentRiskState {
  if (riskFlags.some((flag) => ['secret', 'production_claim', 'license_violation'].includes(flag))) {
    return {
      inputSummary,
      risk: 'secret_or_claim_risk',
      state: 'blocked',
      reasons: riskFlags,
    };
  }

  if (!verified) {
    return {
      inputSummary,
      risk: 'react_before_verify',
      state: 'kilesa_active',
      reasons: ['PENDING_VERIFICATION'],
    };
  }

  return { inputSummary, risk: 'low', state: 'data_verified', reasons: ['VERIFIED'] };
}

export function parami(history: string[]): DsgAgentParamiStats {
  const stats: Record<string, number> = {};
  for (const action of history) stats[action] = (stats[action] || 0) + 1;
  return { type: 'accumulated_statistics', stats };
}

export function userBenefitGate(input: {
  userBenefit: string;
  easier: boolean;
  tangibleOutput: string;
  nextAction: string;
}) {
  const missing = [
    ['userBenefit', input.userBenefit],
    ['tangibleOutput', input.tangibleOutput],
    ['nextAction', input.nextAction],
  ]
    .filter(([, value]) => !String(value || '').trim())
    .map(([key]) => key);

  return {
    ok: missing.length === 0 && input.easier,
    missing,
    userBenefit: input.userBenefit,
    easier: input.easier,
    tangibleOutput: input.tangibleOutput,
    nextAction: input.nextAction,
  };
}

export function truthBoundary(input: {
  verified: boolean;
  containsSecret?: boolean;
  containsProductionClaim?: boolean;
  containsLicenseRisk?: boolean;
}) {
  const blockedReasons: string[] = [];
  if (input.containsSecret) blockedReasons.push('SECRET_PRESENT');
  if (input.containsProductionClaim && !input.verified) blockedReasons.push('UNVERIFIED_PRODUCTION_CLAIM');
  if (input.containsLicenseRisk) blockedReasons.push('LICENSE_REVIEW_REQUIRED');
  return {
    ok: blockedReasons.length === 0,
    blockedReasons,
    productionReadyClaim: false,
    note: 'DSG agent output must stay blocked or review-only until current evidence, build, deploy, and runtime proof exist.',
  };
}
