import { describe, it, expect } from 'vitest';
import { evaluateGate, detectOscillation } from '../../../lib/runtime/gate';
import { canonicalHash } from '../../../lib/runtime/canonical';

describe('playground evaluate — gate integration', () => {
  it('ALLOW when risk_score is 0.1', () => {
    const result = evaluateGate({ riskScore: 0.1 });
    expect(result.decision).toBe('ALLOW');
  });

  it('STABILIZE when risk_score is 0.5', () => {
    const result = evaluateGate({ riskScore: 0.5 });
    expect(result.decision).toBe('STABILIZE');
  });

  it('BLOCK when risk_score is 0.9', () => {
    const result = evaluateGate({ riskScore: 0.9 });
    expect(result.decision).toBe('BLOCK');
  });

  it('STABILIZE on oscillation pattern', () => {
    const scores = [0.1, 0.6, 0.2, 0.58];
    expect(detectOscillation(scores)).toBe(true);
    const result = evaluateGate({ riskScore: 0.2, recentRiskScores: scores });
    expect(result.decision).toBe('STABILIZE');
  });

  it('ALLOW at exact boundary 0.39', () => {
    const result = evaluateGate({ riskScore: 0.39 });
    expect(result.decision).toBe('ALLOW');
  });

  it('STABILIZE at exact boundary 0.4', () => {
    const result = evaluateGate({ riskScore: 0.4 });
    expect(result.decision).toBe('STABILIZE');
  });

  it('BLOCK at exact boundary 0.8', () => {
    const result = evaluateGate({ riskScore: 0.8 });
    expect(result.decision).toBe('BLOCK');
  });

  it('proof_hash is deterministic for same input', () => {
    const input = { risk_score: 0.5, decision: 'STABILIZE', reason: 'test' };
    expect(canonicalHash(input)).toBe(canonicalHash(input));
  });

  it('proof_hash differs for different risk_score', () => {
    const a = canonicalHash({ risk_score: 0.3 });
    const b = canonicalHash({ risk_score: 0.5 });
    expect(a).not.toBe(b);
  });
});
