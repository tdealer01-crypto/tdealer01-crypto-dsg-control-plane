export type Decision = 'ALLOW' | 'STABILIZE' | 'BLOCK';

export type GateInput = {
  agent_id: string;
  action: string;
  payload?: Record<string, unknown>;
};

export type GateOutput = {
  decision: Decision;
  reason: string;
  policy_version: string;
  latency_ms: number;
  evaluated_at: string;
  stability_score: number;
  source: string;
  proof_hash: string | null;
  proof_version: string | null;
};

export type GatePlugin = {
  id: string;
  kind: 'gate';
  verified: boolean;
  evaluate(input: GateInput): Promise<GateOutput>;
  health(): Promise<{ ok: boolean; [key: string]: unknown }>;
};
