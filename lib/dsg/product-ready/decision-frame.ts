export type VerificationStatus = 'pending_verification' | 'verified' | 'no_data_to_process';
export type SamadhiState = 'target_locked';
export type KilesaState = 'kilesa_active' | 'data_verified';

export type VerificationResult<T> = {
  raw: T | null;
  verified: boolean;
  status: VerificationStatus;
};

export type TargetLock = {
  attention: string;
  target: string;
  state: SamadhiState;
};

export type KilesaResult<T> = {
  input: T;
  risk: 'react_before_verify' | 'low';
  state: KilesaState;
};

export type ParamiResult = {
  type: 'accumulated_statistics';
  stats: Record<string, number>;
};

export type DecisionFrameInput = {
  question: string;
  target: string;
  history?: string[];
  verified?: boolean;
};

export type DecisionFrame = {
  verification: VerificationResult<string>;
  targetLock: TargetLock;
  unverifiedRisk: KilesaResult<VerificationResult<string>>;
  statistics: ParamiResult;
  answerPolicy: {
    mustAnswerOnlyTarget: boolean;
    mustNotInventEvidence: boolean;
    mustSeparateVerifiedFromUnverified: boolean;
    mustFailClosedOnMissingData: boolean;
  };
};

export function verify<T>(data?: T | null, verified = false): VerificationResult<T> {
  if (data === undefined || data === null || data === '') {
    return { raw: null, verified: false, status: 'no_data_to_process' };
  }
  return { raw: data, verified, status: verified ? 'verified' : 'pending_verification' };
}

export function samadhi(attention: string, target: string): TargetLock {
  return { attention, target, state: 'target_locked' };
}

export function kilesa<T>(newData: T, verified = false): KilesaResult<T> {
  if (!verified) return { input: newData, risk: 'react_before_verify', state: 'kilesa_active' };
  return { input: newData, risk: 'low', state: 'data_verified' };
}

export function parami(history: string[] = []): ParamiResult {
  const stats = history.reduce<Record<string, number>>((acc, action) => {
    const key = action.trim();
    if (!key) return acc;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  return { type: 'accumulated_statistics', stats };
}

export function buildDecisionFrame(input: DecisionFrameInput): DecisionFrame {
  const verification = verify(input.question, Boolean(input.verified));
  return {
    verification,
    targetLock: samadhi('answer', input.target),
    unverifiedRisk: kilesa(verification, verification.verified),
    statistics: parami(input.history ?? []),
    answerPolicy: {
      mustAnswerOnlyTarget: true,
      mustNotInventEvidence: true,
      mustSeparateVerifiedFromUnverified: true,
      mustFailClosedOnMissingData: true,
    },
  };
}
