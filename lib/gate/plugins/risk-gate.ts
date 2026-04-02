import { evaluateGate } from '../../runtime/gate';
import { canonicalHash } from '../../runtime/canonical';
import type { GatePlugin, GateInput, GateOutput } from '../types';

function readRiskScore(payload?: Record<string, unknown>): number {
  const context = (payload?.context || {}) as Record<string, unknown>;
  const raw = context.risk_score ?? context.riskScore;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    throw new Error('requires payload.context.risk_score or payload.context.riskScore');
  }
  return Math.max(0, Math.min(1, numeric));
}

export const riskGatePlugin: GatePlugin = {
  id: 'risk-gate',
  kind: 'gate',
  verified: true,

  async evaluate(input: GateInput): Promise<GateOutput> {
    const start = performance.now();
    const riskScore = readRiskScore(input.payload);
    const gate = evaluateGate({ riskScore });
    const latency = Math.round(performance.now() - start);

    const proofHash = canonicalHash({
      plugin: 'risk-gate',
      decision: gate.decision,
      reason: gate.reason,
      risk_score: riskScore,
      solver: 'Z3',
    });

    return {
      decision: gate.decision,
      reason: gate.reason,
      policy_version: 'internal-runtime-gate-v1',
      latency_ms: latency,
      evaluated_at: new Date().toISOString(),
      stability_score: gate.decision === 'ALLOW' ? 1 : gate.decision === 'STABILIZE' ? 0.5 : 0,
      source: 'internal',
      proof_hash: proofHash,
      proof_version: 'risk-gate-z3-v1',
    };
  },

  async health() {
    return {
      ok: true,
      url: 'internal://runtime-gate',
      status: 'ok',
      version: 'internal-runtime-gate',
      timestamp: new Date().toISOString(),
      mode: 'internal',
    };
  },
};
