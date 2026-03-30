export type RuntimeSummaryCard = {
  ok?: boolean;
  truth_state?: {
    epoch?: number;
    sequence?: number;
    [key: string]: unknown;
  } | null;
  approvals?: {
    open?: number;
    used?: number;
    recent?: Array<{
      id: string;
      request_id?: string;
      action?: string;
      status: string;
      approved_at?: string;
      used_at?: string | null;
      expires_at?: string;
      [key: string]: unknown;
    }>;
  };
  effects?: {
    committed?: number;
    recent?: Array<{
      effect_id: string;
      request_id?: string;
      action?: string;
      status: string;
      updated_at: string;
      [key: string]: unknown;
    }>;
  };
  ledger?: {
    count?: number;
    recent?: Array<{
      sequence: number;
      action: string;
      decision: string;
      reason: string;
      entry_hash: string;
      created_at: string;
      [key: string]: unknown;
    }>;
  };
  agents?: Array<{
    id: string;
    name: string;
    status: string;
    last_used_at?: string | null;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

export type StreamConsoleMessage = {
  id: string;
  kind:
    | 'intent'
    | 'approval'
    | 'decision'
    | 'tool_call'
    | 'tool_result'
    | 'effect'
    | 'memory_write'
    | 'alert';
  title: string;
  created_at: string;
  body?: string;
  sequence?: number;
  request_id?: string;
  meta?: unknown;
};
