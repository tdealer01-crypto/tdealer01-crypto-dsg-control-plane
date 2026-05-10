import { createHash } from 'node:crypto';
import type { DsgActionActor, DsgActionContract, DsgActionFlow, DsgActionIntent, DsgActionMode, DsgActionRisk } from './types';

function stableStringify(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
}

export function dsgHash(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function createDsgActionId(flow: DsgActionFlow, intent: DsgActionIntent, input: unknown): string {
  return `act_${dsgHash({ flow, intent, input }).slice(0, 16)}`;
}

export function inferActionRisk(flow: DsgActionFlow, intent: DsgActionIntent): DsgActionRisk {
  if (intent === 'execute' || intent === 'runtime_gate') return 'HIGH';
  if (flow === 'governance_vault' || flow === 'governed_tool' || flow === 'autonomous_gate') return 'MEDIUM';
  return 'LOW';
}

export function inferRequiredProof(flow: DsgActionFlow, intent: DsgActionIntent): string[] {
  const base = ['actor', 'inputHash', 'deterministicContract'];
  if (intent === 'execute' || intent === 'runtime_gate') return [...base, 'approval', 'runtimeProof', 'timelineAppend'];
  if (flow === 'live_reasoning') return [...base, 'reasoningTrace', 'policyGuardrail'];
  if (flow === 'telemetry') return [...base, 'statusSnapshot'];
  if (flow === 'proof_timeline') return [...base, 'proofHash'];
  return base;
}

export function chooseMode(risk: DsgActionRisk, requestedMode?: DsgActionMode): DsgActionMode {
  if (risk === 'HIGH' && requestedMode !== 'EXECUTE') return 'DRY_RUN';
  return requestedMode ?? 'DRY_RUN';
}

export function createDsgActionContract(input: {
  flow: DsgActionFlow;
  intent: DsgActionIntent;
  payload: unknown;
  actor?: Partial<DsgActionActor>;
  mode?: DsgActionMode;
}): DsgActionContract {
  const actor: DsgActionActor = {
    actorId: input.actor?.actorId ?? 'dsg-system-actor',
    workspaceId: input.actor?.workspaceId ?? 'dsg-default-workspace',
    permissions: input.actor?.permissions ?? ['dsg:read', 'dsg:plan'],
  };
  const risk = inferActionRisk(input.flow, input.intent);
  const inputHash = dsgHash(input.payload ?? {});
  const actionId = createDsgActionId(input.flow, input.intent, { payload: input.payload, actor, risk });
  const mode = chooseMode(risk, input.mode);

  return {
    actionId,
    flow: input.flow,
    intent: input.intent,
    mode,
    risk,
    actor,
    inputHash,
    requiredProof: inferRequiredProof(input.flow, input.intent),
    createdAt: new Date(0).toISOString(),
    claim: 'ACTION_CONTRACT_VALID',
  };
}
