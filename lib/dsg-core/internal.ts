import { evaluateGate } from '../runtime/gate';
import type { DSGCoreExecutionRequest } from './types';

function readRiskScore(payload?: Record<string, unknown>) {
  const context = (payload?.context || {}) as Record<string, unknown>;
  const raw = context.risk_score ?? context.riskScore;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    throw new Error('internal DSG core mode requires payload.context.risk_score or payload.context.riskScore');
  }
  return Math.max(0, Math.min(1, numeric));
}

export async function getInternalDSGCoreHealth() {
  return {
    ok: true,
    url: 'internal://runtime-gate',
    status: 'ok',
    version: 'internal-runtime-gate',
    timestamp: new Date().toISOString(),
    mode: 'internal',
  };
}

export async function executeOnInternalDSGCore(payload: DSGCoreExecutionRequest) {
  const riskScore = readRiskScore(payload.payload);
  const gate = evaluateGate({ riskScore });

  return {
    decision: gate.decision,
    reason: gate.reason,
    policy_version: 'internal-runtime-gate-v1',
    latency_ms: 0,
    evaluated_at: new Date().toISOString(),
    stability_score: gate.decision === 'ALLOW' ? 1 : gate.decision === 'STABILIZE' ? 0.5 : 0,
    source: 'internal',
  };
}
