import { executeOnRemoteDSGCore, getRemoteDSGCoreHealth } from '../../dsg-core/remote';
import { canonicalHash } from '../../runtime/canonical';
import type { GatePlugin, GateInput, GateOutput } from '../types';

function getRemoteConfig() {
  const url = process.env.DSG_CORE_URL?.replace(/\/$/, '') || '';
  if (!url) throw new Error('DSG_CORE_URL is required for remote-core plugin');
  return { url, apiKey: process.env.DSG_CORE_API_KEY || process.env.DSG_API_KEY || '' };
}

export const remoteCorePlugin: GatePlugin = {
  id: 'remote-core',
  kind: 'gate',
  verified: false,

  async evaluate(input: GateInput): Promise<GateOutput> {
    const config = getRemoteConfig();
    const data = await executeOnRemoteDSGCore(config, {
      agent_id: input.agent_id,
      action: input.action,
      payload: input.payload,
    });

    const proofHash = data.z3_proof_hash || data.proof_hash || canonicalHash({
      plugin: 'remote-core',
      decision: data.decision,
      reason: data.reason,
      url: config.url,
    });

    return {
      decision: String(data.decision || 'BLOCK') as GateOutput['decision'],
      reason: String(data.reason || 'Decision from remote DSG core'),
      policy_version: String(data.policy_version || 'remote-core-v1'),
      latency_ms: Number(data.latency_ms || 0),
      evaluated_at: String(data.evaluated_at || new Date().toISOString()),
      stability_score: Number(data.stability_score ?? 0),
      source: 'remote',
      proof_hash: proofHash,
      proof_version: String(data.proof_version || 'remote-core-v1'),
    };
  },

  async health() {
    return getRemoteDSGCoreHealth(getRemoteConfig());
  },
};
