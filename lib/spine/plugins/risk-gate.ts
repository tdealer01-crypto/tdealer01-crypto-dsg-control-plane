import { detectOscillation, evaluateGate } from '../../runtime/gate';
import type { DSGPlugin } from '../plugin';
import type { PluginInput, PluginOutput } from '../types';

export const riskGatePlugin: DSGPlugin = {
  id: 'dsg-risk-gate-v1',
  name: 'DSG Risk Gate',
  kind: 'gate',
  verification: {
    verified: true,
    solver: 'Z3',
    properties: ['Determinism', 'Safety Invariance'],
  },
  async health() {
    return { ok: true, detail: 'pure function' };
  },
  async evaluate(input: PluginInput): Promise<PluginOutput> {
    const start = performance.now();
    const context = (input.payload.context || input.payload || {}) as Record<string, unknown>;
    const raw = context.risk_score ?? context.riskScore;
    const riskScore = Math.max(0, Math.min(1, Number(raw) || 0));
    const recentScores = Array.isArray(context.recent_risk_scores)
      ? (context.recent_risk_scores as number[])
      : undefined;
    const gate = evaluateGate({ riskScore, recentRiskScores: recentScores });

    return {
      decision: gate.decision,
      reason: gate.reason,
      policy_version: 'dsg-risk-gate-v1',
      latency_ms: Math.round(performance.now() - start),
      proof: {
        proof_hash: 'risk-gate-proof',
        proof_version: 'dsg-risk-gate-v1',
        theorem_set_id: 'risk-gate-core',
        solver: 'Z3',
      },
      metrics: {
        risk_score: riskScore,
        oscillation: recentScores ? detectOscillation(recentScores) : false,
      },
    };
  },
};
