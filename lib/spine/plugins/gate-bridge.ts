import { resolveGate } from '../../gate';
import type { DSGPlugin } from '../plugin';
import type { PluginInput, PluginOutput } from '../types';

export const gateBridgePlugin: DSGPlugin = {
  id: 'dsg-gate-bridge-v1',
  name: 'DSG Existing Gate Bridge',
  kind: 'gate',
  verification: {
    verified: false,
    solver: null,
    properties: ['Delegates to existing gate registry'],
  },
  async health() {
    try {
      const gate = resolveGate();
      const status = await gate.health();
      return { ok: Boolean(status.ok), detail: String(status.detail || gate.id) };
    } catch (error) {
      return { ok: false, detail: error instanceof Error ? error.message : 'unavailable' };
    }
  },
  async evaluate(input: PluginInput): Promise<PluginOutput> {
    const gate = resolveGate();
    const result = await gate.evaluate({
      agent_id: input.agent_id,
      action: input.action,
      payload: input.payload,
    });

    return {
      decision: result.decision,
      reason: result.reason,
      policy_version: result.policy_version,
      latency_ms: result.latency_ms,
      proof: {
        proof_hash: result.proof_hash,
        proof_version: result.proof_version,
        theorem_set_id: null,
        solver: result.source === 'remote' ? null : 'Z3',
      },
      metrics: {
        source: result.source,
        stability_score: result.stability_score,
        evaluated_at: result.evaluated_at,
        delegated_gate: gate.id,
      },
    };
  },
};
