export type RuntimeSummaryCard = {
  truth_state: {
    epoch: number;
    sequence: number;
    t_t: number;
    g_t: string;
    i_t: string;
    s_star_hash: string;
    v_t: Record<string, unknown>;
  } | null;

  approvals: {
    open: number;
    used: number;
    revoked: number;
    recent: Array<{
      id: string;
      request_id: string;
      action: string;
      status: string;
      approved_at: string;
      expires_at: string;
      used_at?: string | null;
    }>;
  };

  effects: {
    committed: number;
    recent: Array<{
      effect_id: string;
      request_id: string;
      action: string;
      status: string;
      updated_at: string;
    }>;
  };

  ledger: {
    count: number;
    recent: Array<{
      sequence: number;
      action: string;
      decision: string;
      reason: string;
      effect_id?: string | null;
      entry_hash: string;
      created_at: string;
    }>;
  };

  memory: {
    count: number;
    recent: Array<{
      id: string;
      request_id: string;
      memory_key: string;
      lineage_hash: string;
      created_at: string;
    }>;
  };

  usage: Array<{
    event_type: string;
    quantity: number;
    amount_usd: number;
    created_at: string;
  }>;

  agents: Array<{
    id: string;
    name: string;
    status: string;
    last_used_at?: string | null;
  }>;
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

  request_id?: string;
  sequence?: number;
  title: string;
  body?: string;
  created_at: string;
  meta?: Record<string, unknown>;
};
