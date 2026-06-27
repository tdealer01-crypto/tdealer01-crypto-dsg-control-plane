import { describe, it, expect } from 'vitest';
import { detectOscillation, evaluateGate } from '../../../lib/runtime/gate';
import type { GatePolicy } from '../../../lib/runtime/gate';

const STRICT: GatePolicy = {
  blockRiskScore: 0.7,
  stabilizeRiskScore: 0.3,
  oscillationWindow: 3,
  oscillationSpread: 0.2,
};

describe('detectOscillation', () => {
  it('returns false when window has fewer scores than required', () => {
    expect(detectOscillation([0.1, 0.8])).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(detectOscillation([])).toBe(false);
  });

  it('returns false when spread is below threshold', () => {
    expect(detectOscillation([0.1, 0.12, 0.11, 0.13])).toBe(false);
  });

  it('returns true when max-min >= oscillationSpread', () => {
    expect(detectOscillation([0.1, 0.6, 0.2, 0.58])).toBe(true);
  });

  it('uses only the last oscillationWindow entries', () => {
    // first 4 scores oscillate heavily, but last 4 are stable
    expect(detectOscillation([0.1, 0.9, 0.1, 0.9, 0.5, 0.51, 0.52, 0.53])).toBe(false);
  });

  it('respects custom oscillationWindow and oscillationSpread', () => {
    // spread = 0.21 >= STRICT.oscillationSpread=0.2, window=3 → oscillates
    expect(detectOscillation([0.1, 0.31], STRICT)).toBe(false); // only 2 < window=3
    expect(detectOscillation([0.1, 0.31, 0.1], STRICT)).toBe(true); // spread=0.21 ≥ 0.2
  });

  it('returns false when called with no arguments (default empty array)', () => {
    expect(detectOscillation()).toBe(false);
  });

  it('returns true when spread equals exactly oscillationSpread threshold (0.35)', () => {
    // default oscillationSpread=0.35, window=4; max-min = 0.35-0.0 = 0.35 >= 0.35 → true
    expect(detectOscillation([0.0, 0.35, 0.0, 0.35])).toBe(true);
  });

  it('returns false when spread is one epsilon below oscillationSpread (0.35)', () => {
    // spread = 0.34, which is < 0.35 → false
    expect(detectOscillation([0.0, 0.34, 0.0, 0.34])).toBe(false);
  });
});

describe('evaluateGate — default policy', () => {
  it('returns BLOCK when riskScore >= blockRiskScore (0.8)', () => {
    expect(evaluateGate({ riskScore: 0.8 }).decision).toBe('BLOCK');
    expect(evaluateGate({ riskScore: 0.99 }).decision).toBe('BLOCK');
    expect(evaluateGate({ riskScore: 1.0 }).decision).toBe('BLOCK');
  });

  it('returns STABILIZE when riskScore >= stabilizeRiskScore (0.4) and no oscillation', () => {
    expect(evaluateGate({ riskScore: 0.4 }).decision).toBe('STABILIZE');
    expect(evaluateGate({ riskScore: 0.5 }).decision).toBe('STABILIZE');
    expect(evaluateGate({ riskScore: 0.79 }).decision).toBe('STABILIZE');
  });

  it('returns STABILIZE on oscillation even with low riskScore', () => {
    const result = evaluateGate({ riskScore: 0.2, recentRiskScores: [0.1, 0.6, 0.2, 0.58] });
    expect(result.decision).toBe('STABILIZE');
    expect(result.reason).toContain('oscillation');
  });

  it('returns ALLOW when risk is low and stable', () => {
    expect(evaluateGate({ riskScore: 0.1, recentRiskScores: [0.1, 0.11, 0.12, 0.13] }).decision).toBe('ALLOW');
    expect(evaluateGate({ riskScore: 0.0 }).decision).toBe('ALLOW');
    expect(evaluateGate({ riskScore: 0.39 }).decision).toBe('ALLOW');
  });

  it('returns ALLOW with no recentRiskScores and low riskScore', () => {
    expect(evaluateGate({ riskScore: 0.1 }).decision).toBe('ALLOW');
  });

  it('BLOCK takes priority over oscillation', () => {
    const result = evaluateGate({ riskScore: 0.95, recentRiskScores: [0.1, 0.9, 0.1, 0.9] });
    expect(result.decision).toBe('BLOCK');
    expect(result.reason).toContain('block threshold');
  });

  it('includes reason string in all decision types', () => {
    expect(evaluateGate({ riskScore: 0.99 }).reason).toBeTruthy();
    expect(evaluateGate({ riskScore: 0.5 }).reason).toBeTruthy();
    expect(evaluateGate({ riskScore: 0.1 }).reason).toBeTruthy();
  });
});

describe('evaluateGate — custom policy', () => {
  it('respects custom blockRiskScore', () => {
    expect(evaluateGate({ riskScore: 0.7 }, STRICT).decision).toBe('BLOCK');
    expect(evaluateGate({ riskScore: 0.69 }, STRICT).decision).not.toBe('BLOCK');
  });

  it('respects custom stabilizeRiskScore', () => {
    expect(evaluateGate({ riskScore: 0.3 }, STRICT).decision).toBe('STABILIZE');
    expect(evaluateGate({ riskScore: 0.29 }, STRICT).decision).toBe('ALLOW');
  });

  it('applies custom oscillation params', () => {
    // 3-score window, spread=0.2 → [0.1, 0.31, 0.1] triggers STABILIZE at low riskScore=0.1
    const result = evaluateGate({ riskScore: 0.1, recentRiskScores: [0.1, 0.31, 0.1] }, STRICT);
    expect(result.decision).toBe('STABILIZE');
  });
});
