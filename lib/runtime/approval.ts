import { sha256Hex } from './canonical';

export type IntentEnvelope = {
  request_id: string;
  action: string;
  next_v: Record<string, unknown>;
  next_t: number;
  next_g: string;
  next_i: string;
};

export type ApprovalSeed = {
  orgId: string;
  agentId: string;
  requestId: string;
  action: string;
  inputHash: string;
  epoch: number;
};

export function computeInputHash(intent: IntentEnvelope): string {
  return sha256Hex({
    action: intent.action,
    next_v: intent.next_v,
    next_t: intent.next_t,
    next_g: intent.next_g,
    next_i: intent.next_i,
  });
}

export function computeApprovalHash(seed: ApprovalSeed): string {
  return sha256Hex({
    org_id: seed.orgId,
    agent_id: seed.agentId,
    request_id: seed.requestId,
    action: seed.action,
    input_hash: seed.inputHash,
    epoch: seed.epoch,
  });
}

export function computeEffectId(params: {
  epoch: number;
  sequence: number;
  action: string;
  payloadHash: string;
}): string {
  return sha256Hex({
    epoch: params.epoch,
    sequence: params.sequence,
    action: params.action,
    payload_hash: params.payloadHash,
  });
}

export function computeMemoryLineageHash(params: {
  orgId: string;
  agentId: string | null;
  requestId: string | null;
  memoryKey: string;
  memoryValue: unknown;
}): string {
  return sha256Hex({
    org_id: params.orgId,
    agent_id: params.agentId,
    request_id: params.requestId,
    memory_key: params.memoryKey,
    memory_value: params.memoryValue,
  });
}
