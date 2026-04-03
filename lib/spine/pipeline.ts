import { registry } from './plugin';
import { ensureSpinePluginsRegistered } from './register-defaults';
import type { Decision, PipelineResult, PluginOutput, PluginInput } from './types';

const DECISION_SEVERITY: Record<Decision, number> = {
  ALLOW: 0,
  STABILIZE: 1,
  BLOCK: 2,
};

function severity(decision: Decision): number {
  return DECISION_SEVERITY[decision];
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

function normalizeDecision(value: unknown): Decision {
  if (value === 'ALLOW' || value === 'STABILIZE' || value === 'BLOCK') {
    return value;
  }
  return 'BLOCK';
}

function pluginError(pluginId: string, error: unknown): PluginOutput {
  const message = error instanceof Error ? error.message : 'unknown';
  return {
    decision: 'BLOCK',
    reason: 'PLUGIN_EVALUATION_ERROR',
    policy_version: `${pluginId}:error`,
    latency_ms: 0,
    proof: defaultProof(),
    metrics: {
      plugin_id: pluginId,
      error: message,
    },
  };
}

function normalizeOutput(pluginId: string, output: Partial<PluginOutput> | undefined): PluginOutput {
  const latencyValue = Number(output?.latency_ms);
  return {
    decision: normalizeDecision(output?.decision),
    reason: output?.reason || `${pluginId}:NO_REASON`,
    policy_version: output?.policy_version || `${pluginId}:unknown`,
    latency_ms: Number.isFinite(latencyValue) ? Math.max(0, latencyValue) : 0,
    proof: output?.proof || defaultProof(),
    metrics: output?.metrics || {},
  };
}

function buildBlockedPipeline(pluginId: string, reason: string): PipelineResult {
  const output = normalizeOutput(pluginId, {
    decision: 'BLOCK',
    reason,
    policy_version: `${pluginId}:missing`,
    latency_ms: 0,
    proof: defaultProof(),
    metrics: { plugin_id: pluginId },
  });

  return {
    final_decision: output.decision,
    final_reason: output.reason,
    final_policy_version: output.policy_version,
    total_latency_ms: output.latency_ms,
    proof: output.proof,
    authoritative_plugin_id: pluginId,
    stages: [
      {
        plugin_id: pluginId,
        decision: output.decision,
        reason: output.reason,
        latency_ms: output.latency_ms,
        proof_hash: output.proof.proof_hash,
      },
    ],
  };
}

async function evaluatePlugin(pluginId: string, input: PluginInput): Promise<PluginOutput> {
  const plugin = registry.get(pluginId);
  if (!plugin) {
    return normalizeOutput(pluginId, {
      decision: 'BLOCK',
      reason: 'PLUGIN_NOT_FOUND',
      policy_version: `${pluginId}:missing`,
      latency_ms: 0,
      proof: defaultProof(),
      metrics: { plugin_id: pluginId },
    });
  }

  const output = await plugin.evaluate(input).catch((error) => pluginError(pluginId, error));
  return normalizeOutput(pluginId, output);
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
      if (combined !== finalDecision && severity(output.decision) >= severity(finalDecision)) {
        finalDecision = combined;
        finalReason = output.reason;
        finalPolicyVersion = output.policy_version;
        authoritativePluginId = arbiter.id;
        authoritativeProof = output.proof;
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
