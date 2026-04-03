import { registry } from './plugin';
import { ensureSpinePluginsRegistered } from './register-defaults';
import type { Decision, PipelineResult, PluginInput, PluginOutput } from './types';

const DECISION_SEVERITY: Record<Decision, number> = {
  ALLOW: 0,
  STABILIZE: 1,
  BLOCK: 2,
};

function combineDecision(left: Decision, right: Decision): Decision {
  return DECISION_SEVERITY[left] >= DECISION_SEVERITY[right] ? left : right;
}

function defaultProof(): PluginOutput['proof'] {
  return {
    proof_hash: null,
    proof_version: null,
    theorem_set_id: null,
    solver: null,
  };
}

function normalizeDecision(value: unknown): Decision {
  if (value === 'ALLOW' || value === 'STABILIZE' || value === 'BLOCK') {
    return value;
  }
  return 'BLOCK';
}

function pluginError(pluginId: string, error: unknown): PluginOutput {
  return {
    decision: 'BLOCK',
    reason: 'PLUGIN_EVALUATION_ERROR',
    policy_version: `${pluginId}:error`,
    latency_ms: 0,
    proof: defaultProof(),
    metrics: {
      plugin_id: pluginId,
      error: error instanceof Error ? error.message : 'unknown',
    },
  };
}

function normalizeOutput(pluginId: string, output: PluginOutput): PluginOutput {
  return {
    ...output,
    decision: normalizeDecision(output.decision),
    reason: String(output.reason || `${pluginId}:NO_REASON`),
    policy_version: String(output.policy_version || `${pluginId}:unknown`),
    latency_ms: Math.max(0, Number(output.latency_ms || 0)),
    proof: output.proof || defaultProof(),
    metrics: output.metrics || {},
  };
}

function buildBlockedPipeline(pluginId: string, reason: string): PipelineResult {
  return {
    final_decision: 'BLOCK',
    final_reason: reason,
    final_policy_version: `${pluginId}:missing`,
    total_latency_ms: 0,
    proof: defaultProof(),
    authoritative_plugin_id: pluginId,
    stages: [
      {
        plugin_id: pluginId,
        decision: 'BLOCK',
        reason,
        latency_ms: 0,
        proof_hash: null,
      },
    ],
  };
}

async function evaluatePlugin(pluginId: string, input: PluginInput): Promise<PluginOutput> {
  const plugin = registry.get(pluginId);
  if (!plugin) {
    return {
      decision: 'BLOCK',
      reason: 'PLUGIN_NOT_FOUND',
      policy_version: `${pluginId}:missing`,
      latency_ms: 0,
      proof: defaultProof(),
      metrics: { plugin_id: pluginId },
    };
  }

  const output = await plugin.evaluate(input).catch((error) => pluginError(plugin.id, error));
  return normalizeOutput(plugin.id, output);
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
  if (!gatePlugin || gatePlugin.kind !== 'gate') {
    return buildBlockedPipeline(gateId, 'GATE_PLUGIN_NOT_FOUND');
  }

  const gateOutput = await evaluatePlugin(gatePlugin.id, input);
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
      const output = await evaluatePlugin(arbiter.id, input);
      totalLatency += output.latency_ms;
      stages.push({
        plugin_id: arbiter.id,
        decision: output.decision,
        reason: output.reason,
        latency_ms: output.latency_ms,
        proof_hash: output.proof.proof_hash,
      });

      const combined = combineDecision(finalDecision, output.decision);
      if (combined !== finalDecision) {
        finalDecision = combined;
        finalReason = output.reason;
        finalPolicyVersion = output.policy_version;
        authoritativePluginId = arbiter.id;
        authoritativeProof = output.proof;
      }
    }
  }

  const observers = registry.getByKind('observer').sort((a, b) => a.id.localeCompare(b.id));
  for (const observer of observers) {
    const output = await evaluatePlugin(observer.id, input);
    totalLatency += output.latency_ms;
    stages.push({
      plugin_id: observer.id,
      decision: output.decision,
      reason: output.reason,
      latency_ms: output.latency_ms,
      proof_hash: output.proof.proof_hash,
    });
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
