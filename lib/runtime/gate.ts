export type GateDecision = 'ALLOW' | 'STABILIZE' | 'BLOCK';

export type GatePolicy = {
  blockRiskScore: number;
  stabilizeRiskScore: number;
  oscillationWindow: number;
  oscillationSpread: number;
};

export type GateInput = {
  riskScore: number;
  recentRiskScores?: number[];
};

const DEFAULT_POLICY: GatePolicy = {
  blockRiskScore: 0.8,
  stabilizeRiskScore: 0.4,
  oscillationWindow: 4,
  oscillationSpread: 0.35,
};

export function detectOscillation(
  recentRiskScores: number[] = [],
  policy: GatePolicy = DEFAULT_POLICY
): boolean {
  if (recentRiskScores.length < policy.oscillationWindow) {
    return false;
  }

  const window = recentRiskScores.slice(-policy.oscillationWindow);
  const min = Math.min(...window);
  const max = Math.max(...window);
  return max - min >= policy.oscillationSpread;
}

export function evaluateGate(
  input: GateInput,
  policy: GatePolicy = DEFAULT_POLICY
): { decision: GateDecision; reason: string } {
  if (input.riskScore >= policy.blockRiskScore) {
    return { decision: 'BLOCK', reason: 'risk score exceeded block threshold' };
  }

  if (detectOscillation(input.recentRiskScores, policy)) {
    return { decision: 'STABILIZE', reason: 'risk oscillation window exceeded spread limit' };
  }

  if (input.riskScore >= policy.stabilizeRiskScore) {
    return { decision: 'STABILIZE', reason: 'risk score exceeded stabilize threshold' };
  }

  return { decision: 'ALLOW', reason: 'risk score below stabilize threshold' };
}
