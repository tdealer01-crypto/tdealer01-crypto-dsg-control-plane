export type DSGCoreExecutionRequest = {
  agent_id: string;
  action: string;
  payload?: Record<string, unknown>;
};

export type DSGCoreAuditEvent = {
  id?: number;
  epoch: string | number | null;
  sequence: number;
  region_id: string;
  state_hash: string | null;
  entropy: number | null;
  gate_result: 'ALLOW' | 'STABILIZE' | 'BLOCK' | string | null;
  z3_proof_hash?: string | null;
  signature?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string | null;
};

export type DSGCoreDeterminism = {
  sequence: number;
  region_count: number;
  unique_state_hashes: number;
  max_entropy: number;
  deterministic: boolean;
  gate_action: string;
};

export type DSGCoreMode = 'internal' | 'remote';

export type DSGCoreHealthResult = {
  ok: boolean;
  url: string;
  status?: string | null;
  version?: string | null;
  timestamp?: string | null;
  mode?: string;
  error?: string;
};
