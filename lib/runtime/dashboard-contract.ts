export type RuntimeSummaryCard = {
  truth_state?: {
    epoch?: number;
    sequence?: number;
  } | null;
  approvals?: {
    open?: number;
    recent?: Array<{
      id: string;
      status: string;
      request_id?: string | null;
      action?: string | null;
      approved_at?: string | null;
      used_at?: string | null;
      expires_at: string;
    }>;
  };
  effects?: {
    committed?: number;
    recent?: Array<{
      effect_id: string;
      request_id?: string | null;
      action: string;
      status: string;
      updated_at: string;
    }>;
  };
  ledger?: {
    recent?: Array<{
      sequence: number;
      action: string;
      decision: string;
      reason: string;
      entry_hash: string;
      created_at: string;
    }>;
  };
};

export type StreamConsoleMessage = {
  id: string;
  kind: 'decision' | 'effect' | 'approval';
  request_id?: string | null;
  sequence?: number;
  title: string;
  body: string;
  created_at: string;
  meta?: Record<string, unknown>;
};
