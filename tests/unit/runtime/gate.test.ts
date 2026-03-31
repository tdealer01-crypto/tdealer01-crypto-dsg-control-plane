import { detectOscillation, evaluateGate } from '../../../lib/runtime/gate';

describe('runtime gate', () => {
  it('returns BLOCK above threshold', () => {
    expect(evaluateGate({ riskScore: 0.95 }).decision).toBe('BLOCK');
  });

  it('returns STABILIZE on oscillation', () => {
    const oscillating = detectOscillation([0.1, 0.6, 0.2, 0.58]);
    expect(oscillating).toBe(true);
    expect(evaluateGate({ riskScore: 0.2, recentRiskScores: [0.1, 0.6, 0.2, 0.58] }).decision).toBe('STABILIZE');
  });

  it('returns ALLOW when risk is low and stable', () => {
    expect(evaluateGate({ riskScore: 0.1, recentRiskScores: [0.1, 0.11, 0.12, 0.13] }).decision).toBe('ALLOW');
  });
});
