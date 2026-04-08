import { registry } from './plugin';
import { ensureSpinePluginsRegistered } from './register-defaults';
import type { Decision, PipelineResult, PluginOutput, PluginInput } from './types';

export class SpineInfraError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpineInfraError';
  }
}

function severity(decision: Decision): number {
  const severities: Record<Decision, number> = { ALLOW: 0, STABILIZE: 1, BLOCK: 2 };
  return severities[decision];
}

function combineDecision(left: Decision, right: Decision): Decision {
  return severity(left) >= severity(right) ? left : right;
}

function defaultProof(): PluginOutput['proof'] {
  return {
    proof_hash: null,
    proof_version: null,
    theorem_set_id: null,
    solver: null,
  };
}

function pluginError(pluginId: string, error: unknown): PluginOutput {
  return {
    decision: 'BLOCK',
    reason: `${pluginId}:PLUGIN_EVALUATION_ERROR`,
    policy_version: `${pluginId}:error`,
    latency_ms: 0,
    proof: defaultProof(),
    metrics: {
      error: error instanceof Error ? error.message : 'unknown',
    },
  };
}

export async function runPipeline(input: PluginInput): Promise<PipelineResult> {
  ensureSpinePluginsRegistered();

  const stages: PipelineResult['stages'] = [];
  let finalDecision: Decision = 'ALLOW';
  let finalReason = 'ALLOW';
  let finalPolicyVersion = 'spine-unset';
  let authoritativePluginId = 'none';
  let authoritativeProof = defaultProof();
  let totalLatency = 0;

  const gateId = process.env.DSG_SPINE_GATE_PLUGIN || 'dsg-gate-bridge-v1';
  const gatePlugin = registry.get(gateId);
  if (!gatePlugin) {
    throw new SpineInfraError('GATE_PLUGIN_NOT_FOUND');
  }
  if (gatePlugin.kind !== 'gate') {
    throw new SpineInfraError('GATE_PLUGIN_INVALID_KIND');
  }

  const gateOutput = await gatePlugin.evaluate(input).catch((error) => pluginError(gatePlugin.id, error));
  totalLatency += gateOutput.latency_ms;
  finalDecision = gateOutput.decision;
  finalReason = gateOutput.reason;
  finalPolicyVersion = gateOutput.policy_version;
  authoritativePluginId = gatePlugin.id;
  authoritativeProof = gateOutput.proof;
  stages.push({
    plugin_id: gatePlugin.id,
    decision: gateOutput.decision,
    reason: gateOutput.reason,
    latency_ms: gateOutput.latency_ms,
    proof_hash: gateOutput.proof.proof_hash,
  });

  if (gateOutput.decision !== 'BLOCK') {
    const arbiters = registry.getByKind('arbiter').sort((a, b) => a.id.localeCompare(b.id));
    for (const arbiter of arbiters) {
      const output = await arbiter.evaluate(input).catch((error) => pluginError(arbiter.id, error));
      totalLatency += output.latency_ms;
      stages.push({
        plugin_id: arbiter.id,
        decision: output.decision,
        reason: output.reason,
        latency_ms: output.latency_ms,
        proof_hash: output.proof.proof_hash,
      });

      const combined = combineDecision(finalDecision, output.decision);
      if (combined !== finalDecision && severity(output.decision) >= severity(finalDecision)) {
        finalDecision = combined;
        finalReason = output.reason;
        finalPolicyVersion = output.policy_version;
        authoritativePluginId = arbiter.id;
        authoritativeProof = output.proof;
      }
    }
  }

  return {
    final_decision: finalDecision,
    final_reason: finalReason,
    final_policy_version: finalPolicyVersion,
    total_latency_ms: totalLatency,
    proof: authoritativeProof,
    authoritative_plugin_id: authoritativePluginId,
    stages,
  };
}
