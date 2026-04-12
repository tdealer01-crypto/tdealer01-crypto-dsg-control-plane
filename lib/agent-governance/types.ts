export type ToolName =
  | 'readiness'
  | 'capacity'
  | 'usage'
  | 'audit_summary'
  | 'checkpoint'
  | 'recovery_validate'
  | 'list_agents'
  | 'create_agent'
  | 'list_policies'
  | 'reconcile_effect'
  | 'execute_action'
  | 'browser_navigate'
  | 'telegram_send'
  | 'auto_setup';

export type AgentStep = {
  step_index: number;
  tool: ToolName;
  params: Record<string, unknown>;
  policy_mode: 'allow' | 'review_required' | 'block';
  status: 'pending' | 'running' | 'completed' | 'blocked' | 'failed' | 'review_required';
  result?: unknown;
  error?: string;
};

export type AgentExecuteBody = {
  workspace_id: string;
  org_id: string;
  provider: string;
  agent_id: string;
  message?: string;
  plan?: AgentStep[];
};

export type ExecutionProof = {
  execution_id: string;
  workspace_id: string;
  org_id: string;
  provider: string;
  agent_id: string;
  status: string;
  steps: Array<{
    step_index: number;
    tool: ToolName;
    policy_mode: AgentStep['policy_mode'];
    status: AgentStep['status'];
    approval_status?: 'pending' | 'approved' | 'rejected';
    result?: unknown;
    error?: string;
  }>;
  audit_refs: string[];
  ledger_refs: string[];
  usage_refs: string[];
};
