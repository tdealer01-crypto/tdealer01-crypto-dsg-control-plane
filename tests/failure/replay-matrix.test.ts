import { evaluateGate } from '../../lib/runtime/gate';

const replayCases = [
  { name: 'high risk replay', risk: 0.99, expected: 'BLOCK' },
  { name: 'mid risk replay', risk: 0.55, expected: 'STABILIZE' },
  { name: 'low risk replay', risk: 0.05, expected: 'ALLOW' },
] as const;

describe('runtime replay matrix', () => {
  it.each(replayCases)('$name', ({ risk, expected }) => {
    expect(evaluateGate({ riskScore: risk }).decision).toBe(expected);
  });

  it('stabilizes oscillation edge case replay', () => {
    expect(evaluateGate({ riskScore: 0.2, recentRiskScores: [0.15, 0.6, 0.2, 0.58] }).decision).toBe('STABILIZE');
  });
});
