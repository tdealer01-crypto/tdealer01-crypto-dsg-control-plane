import { buildDhammaProofHash, MAKK8_VERSION, Makk8Arbiter, type Makk8ActionData } from '../../runtime/makk8-arbiter';
import type { DSGPlugin } from '../plugin';
import type { PluginInput, PluginOutput } from '../types';

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return fallback;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildActionData(input: Record<string, unknown>, context: Record<string, unknown>): Makk8ActionData {
  const value = normalizeNumber(input.value ?? context.value, 0);
  return {
    value,
    is_grounded: normalizeBoolean(context.is_grounded ?? input.is_grounded, true),
    intent_score: normalizeNumber(context.intent_score ?? input.intent_score, 1),
    is_api_clean: normalizeBoolean(context.is_api_clean ?? input.is_api_clean, true),
    source_verified: normalizeBoolean(context.source_verified ?? input.source_verified, true),
    compute_cost: normalizeNumber(context.compute_cost ?? input.compute_cost, 0),
    has_audit_trail: true,
    nonce_lock: normalizeBoolean(context.nonce_lock ?? input.nonce_lock, true),
  };
}

export const arbiterPlugin: DSGPlugin = {
  id: 'dsg-makk8-arbiter-v1',
  name: 'DSG MAKK8 Arbiter',
  kind: 'arbiter',
  verification: {
    verified: false,
    solver: null,
    properties: ['Integrity Check', 'Risk Evaluation', 'Ethical Constraint'],
  },
  async health() {
    return { ok: true, detail: 'local arbiter' };
  },
  async evaluate(input: PluginInput): Promise<PluginOutput> {
    const start = performance.now();
    const payload = (input.payload.input || {}) as Record<string, unknown>;
    const context = (input.payload.context || {}) as Record<string, unknown>;
    const actionData = buildActionData(payload, context);
    const verification = new Makk8Arbiter().verifyPathIntegrity(actionData);
    const value = Number(actionData.value || 0);

    return {
      decision: verification.ok ? 'ALLOW' : 'BLOCK',
      reason: verification.reason,
      policy_version: MAKK8_VERSION,
      latency_ms: Math.round(performance.now() - start),
      proof: {
        proof_hash: buildDhammaProofHash(verification.artifact, value),
        proof_version: 'makk8-v159',
        theorem_set_id: 'makk8-integrity',
        solver: null,
      },
      metrics: {
        artifact: verification.artifact,
        action_value: value,
      },
    };
  },
};
