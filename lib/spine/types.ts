import type { CanonicalInput } from '../runtime/canonical';

export type Decision = 'ALLOW' | 'STABILIZE' | 'BLOCK';

type CanonicalRecord = { [key: string]: CanonicalInput | undefined };

export type TruthState = {
  id?: string;
  canonical_hash: string;
  canonical_json: Record<string, unknown> | null;
  created_at?: string;
} | null;

export type PluginInput = {
  org_id: string;
  agent_id: string;
  action: string;
  payload: Record<string, unknown>;
  truth_state: TruthState;
  approval: {
    approval_id: string;
    approval_key: string;
    expires_at: string | null;
  } | null;
  spine: {
    request_id: string;
    received_at: string;
    billing_period: string;
  };
};

export type PluginOutput = {
  decision: Decision;
  reason: string;
  policy_version: string;
  latency_ms: number;
  proof: {
    proof_hash: string | null;
    proof_version: string | null;
    theorem_set_id: string | null;
    solver: string | null;
  };
  metrics: Record<string, unknown>;
};

export type PipelineStageTrace = {
  plugin_id: string;
  decision: Decision;
  reason: string;
  latency_ms: number;
  proof_hash: string | null;
};

export type PipelineResult = {
  final_decision: Decision;
  final_reason: string;
  final_policy_version: string;
  total_latency_ms: number;
  proof: PluginOutput['proof'];
  authoritative_plugin_id: string;
  stages: PipelineStageTrace[];
};

export type SpineIntentPayload = {
  agentId: string;
  action: string;
  input: CanonicalRecord;
  context: CanonicalRecord;
  canonicalRequest: {
    action: string;
    input: CanonicalRecord;
    context: CanonicalRecord;
  };
};
