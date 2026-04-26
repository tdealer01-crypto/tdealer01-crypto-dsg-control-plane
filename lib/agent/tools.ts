import type { AgentContext } from './context';

export type AgentTool = {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, { type: string; required: boolean; description: string }>;
  riskLevel: 'read' | 'write' | 'critical';
  requiredRole: string;
  execute: (params: Record<string, unknown>, context: AgentContext) => Promise<unknown>;
};

const noParams: AgentTool['parameters'] = {};
const agentIdParam = { agent_id: { type: 'string', required: true, description: 'Agent ID' } };
const limitParam = { limit: { type: 'number', required: false, description: 'Max items' } };

function hasValue(value: unknown) {
  return typeof value === 'string' ? value.trim().length > 0 : value !== undefined && value !== null;
}

async function callJson(context: AgentContext, path: string, init?: RequestInit) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (context.authHeader) headers.authorization = context.authHeader;
  if (context.cookieHeader) headers.cookie = context.cookieHeader;

  const response = await fetch(`${context.origin}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
    cache: 'no-store',
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String((json as { error?: unknown }).error || `Tool call failed (${path})`));
  }

  return json;
}

function postJson(context: AgentContext, path: string, body?: unknown) {
  return callJson(context, path, { method: 'POST', body: JSON.stringify(body || {}) });
}

function mcpCall(context: AgentContext, body: Record<string, unknown>) {
  return postJson(context, '/api/mcp/call', body);
}

export const DSG_TOOLS: AgentTool[] = [
  {
    id: 'readiness',
    name: 'Check System Readiness',
    description: 'Fetch production readiness status.',
    parameters: noParams,
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (_params, context) => callJson(context, '/api/readiness'),
  },
  {
    id: 'execute_action',
    name: 'Execute Agent Action',
    description: 'Create intent and execute through DSG gate with full audit.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Target agent ID' },
      action: { type: 'string', required: true, description: 'Action name' },
      payload: { type: 'object', required: false, description: 'Action payload' },
    },
    riskLevel: 'critical',
    requiredRole: 'execute',
    execute: async (params, context) =>
      mcpCall(context, {
        agent_id: params.agent_id,
        action: params.action,
        payload: params.payload || {},
        tool_name: 'agent-chat',
      }),
  },
  {
    id: 'chatbot_message',
    name: 'Chat with Chatbot Agent',
    description: 'Send a chatbot message through the governed DSG execution path.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Target chatbot agent ID' },
      message: { type: 'string', required: true, description: 'Message' },
    },
    riskLevel: 'critical',
    requiredRole: 'execute',
    execute: async (params, context) =>
      mcpCall(context, {
        agent_id: params.agent_id,
        action: 'chatbot.message',
        payload: { message: String(params.message || '') },
        tool_name: 'chatbot_message',
      }),
  },
  {
    id: 'browser_navigate',
    name: 'Browser Navigate & Extract',
    description: 'Navigate to a target URL through Browserbase executor.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Target agent ID' },
      url: { type: 'string', required: true, description: 'Target URL' },
      extract: { type: 'string', required: false, description: 'Extraction instruction' },
    },
    riskLevel: 'critical',
    requiredRole: 'execute',
    execute: async (params, context) =>
      mcpCall(context, {
        agent_id: params.agent_id,
        action: 'browser.navigate',
        payload: { url: params.url, extract: params.extract },
        tool_name: 'browser_navigate',
      }),
  },
  {
    id: 'telegram_send',
    name: 'Send Telegram Message',
    description: 'Send a message to Telegram through DSG spine.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Target agent ID' },
      chat_id: { type: 'string', required: true, description: 'Telegram chat ID' },
      text: { type: 'string', required: true, description: 'Message text' },
    },
    riskLevel: 'critical',
    requiredRole: 'execute',
    execute: async (params, context) =>
      mcpCall(context, {
        agent_id: params.agent_id,
        action: 'social.telegram.send',
        payload: { chat_id: params.chat_id, text: params.text },
        tool_name: 'telegram_send',
      }),
  },
  {
    id: 'audit_summary',
    name: 'Get Runtime Audit Summary',
    description: 'Fetch runtime truth and latest ledger entries for an agent.',
    parameters: { agent_id: { type: 'string', required: false, description: 'Agent ID' } },
    riskLevel: 'read',
    requiredRole: 'runtime_summary',
    execute: async (params, context) => {
      if (!hasValue(params.agent_id)) return callJson(context, '/api/audit?limit=20');
      return callJson(context, `/api/runtime-summary?org_id=${encodeURIComponent(context.orgId)}&agent_id=${encodeURIComponent(String(params.agent_id))}`);
    },
  },
  {
    id: 'recovery_validate',
    name: 'Validate Runtime Recovery',
    description: 'Validate lineage integrity and missing sequences.',
    parameters: { agent_id: { type: 'string', required: false, description: 'Agent ID' } },
    riskLevel: 'read',
    requiredRole: 'checkpoint',
    execute: async (params, context) => {
      if (!hasValue(params.agent_id)) return callJson(context, '/api/executions?limit=10');
      return postJson(context, '/api/runtime-recovery', { org_id: context.orgId, agent_id: params.agent_id });
    },
  },
  {
    id: 'checkpoint',
    name: 'Create Runtime Checkpoint',
    description: 'Create a checkpoint hash from latest truth and ledger.',
    parameters: agentIdParam,
    riskLevel: 'write',
    requiredRole: 'checkpoint',
    execute: async (params, context) => postJson(context, '/api/checkpoint', { org_id: context.orgId, agent_id: params.agent_id }),
  },
  {
    id: 'create_agent',
    name: 'Create New Agent',
    description: 'Create a new agent with one-time API key return.',
    parameters: {
      name: { type: 'string', required: true, description: 'Agent name' },
      policy_id: { type: 'string', required: false, description: 'Policy ID' },
      monthly_limit: { type: 'number', required: false, description: 'Monthly execution limit' },
    },
    riskLevel: 'write',
    requiredRole: 'execute',
    execute: async (params, context) => {
      const body: Record<string, unknown> = {
        name: String(params.name || 'New Agent'),
        monthly_limit: Number(params.monthly_limit || 10000),
      };
      if (hasValue(params.policy_id)) body.policy_id = String(params.policy_id);
      return postJson(context, '/api/agents', body);
    },
  },
  {
    id: 'create_chatbot_agent',
    name: 'Create Chatbot Agent',
    description: 'Create a chatbot-ready agent with safe defaults.',
    parameters: {
      name: { type: 'string', required: false, description: 'Agent name' },
      policy_id: { type: 'string', required: false, description: 'Policy ID' },
      monthly_limit: { type: 'number', required: false, description: 'Monthly execution limit' },
    },
    riskLevel: 'write',
    requiredRole: 'execute',
    execute: async (params, context) => {
      const body: Record<string, unknown> = {
        name: String(params.name || 'Chatbot Agent'),
        monthly_limit: Number(params.monthly_limit || 50000),
      };
      if (hasValue(params.policy_id)) body.policy_id = String(params.policy_id);
      return postJson(context, '/api/agents', body);
    },
  },
  { id: 'list_agents', name: 'List Agents', description: 'List org agents.', parameters: noParams, riskLevel: 'read', requiredRole: 'execute', execute: async (_params, context) => callJson(context, '/api/agents') },
  { id: 'list_policies', name: 'List Policies', description: 'List available policies.', parameters: noParams, riskLevel: 'read', requiredRole: 'policies_read', execute: async (_params, context) => callJson(context, '/api/policies') },
  { id: 'capacity', name: 'Check Quota & Capacity', description: 'Fetch quota remaining.', parameters: noParams, riskLevel: 'read', requiredRole: 'usage_read', execute: async (_params, context) => callJson(context, '/api/capacity') },
  { id: 'get_usage', name: 'Get Usage', description: 'Get plan usage.', parameters: noParams, riskLevel: 'read', requiredRole: 'usage_read', execute: async (_params, context) => callJson(context, '/api/usage') },
  { id: 'get_metrics', name: 'Get Metrics', description: 'Get metrics.', parameters: noParams, riskLevel: 'read', requiredRole: 'monitor', execute: async (_params, context) => callJson(context, '/api/metrics') },
  { id: 'get_integration', name: 'Get Integration Status', description: 'Get integration status.', parameters: noParams, riskLevel: 'read', requiredRole: 'monitor', execute: async (_params, context) => callJson(context, '/api/integration') },
  { id: 'get_enterprise_proof', name: 'Get Enterprise Proof Report', description: 'Get proof report.', parameters: noParams, riskLevel: 'read', requiredRole: 'monitor', execute: async (_params, context) => callJson(context, '/api/enterprise-proof/report') },
  { id: 'auto_setup', name: 'Run Org Auto Setup', description: 'Auto-configure defaults.', parameters: noParams, riskLevel: 'critical', requiredRole: 'org_admin', execute: async (_params, context) => postJson(context, '/api/setup/auto') },
  { id: 'realtime_web_search', name: 'Real-time Web Search', description: 'Search live web.', parameters: { query: { type: 'string', required: true, description: 'Search query' } }, riskLevel: 'read', requiredRole: 'monitor', execute: async (params, context) => callJson(context, `/api/realtime-search?q=${encodeURIComponent(String(params.query || ''))}`) },
  { id: 'list_executions', name: 'List Executions', description: 'List executions.', parameters: limitParam, riskLevel: 'read', requiredRole: 'monitor', execute: async (params, context) => callJson(context, `/api/executions?limit=${encodeURIComponent(String(params.limit || 10))}`) },
  { id: 'list_proofs', name: 'List Proofs', description: 'List proof artifacts.', parameters: limitParam, riskLevel: 'read', requiredRole: 'monitor', execute: async (params, context) => callJson(context, `/api/proofs?limit=${encodeURIComponent(String(params.limit || 20))}`) },
  { id: 'get_ledger', name: 'Get Ledger', description: 'Get ledger snapshot.', parameters: limitParam, riskLevel: 'read', requiredRole: 'monitor', execute: async (params, context) => callJson(context, `/api/ledger?limit=${encodeURIComponent(String(params.limit || 20))}`) },
  { id: 'get_audit', name: 'Get Audit Events', description: 'Get audit events.', parameters: limitParam, riskLevel: 'read', requiredRole: 'monitor', execute: async (params, context) => callJson(context, `/api/audit?limit=${encodeURIComponent(String(params.limit || 20))}`) },
  { id: 'get_execution_proof', name: 'Get Execution Proof', description: 'Get replay proof.', parameters: { execution_id: { type: 'string', required: true, description: 'Execution ID' } }, riskLevel: 'read', requiredRole: 'monitor', execute: async (params, context) => callJson(context, `/api/replay/${encodeURIComponent(String(params.execution_id || ''))}`) },
  { id: 'get_agent_detail', name: 'Get Agent Detail', description: 'Get one agent.', parameters: agentIdParam, riskLevel: 'read', requiredRole: 'execute', execute: async (params, context) => callJson(context, `/api/agents/${encodeURIComponent(String(params.agent_id || ''))}`) },
  { id: 'rotate_agent_key', name: 'Rotate Agent API Key', description: 'Rotate API key.', parameters: agentIdParam, riskLevel: 'critical', requiredRole: 'execute', execute: async (params, context) => postJson(context, `/api/agents/${encodeURIComponent(String(params.agent_id || ''))}/rotate-key`) },
  { id: 'delete_agent', name: 'Disable Agent', description: 'Disable agent.', parameters: agentIdParam, riskLevel: 'critical', requiredRole: 'execute', execute: async (params, context) => callJson(context, `/api/agents/${encodeURIComponent(String(params.agent_id || ''))}`, { method: 'DELETE' }) },
  { id: 'update_agent', name: 'Update Agent', description: 'Update agent.', parameters: agentIdParam, riskLevel: 'write', requiredRole: 'execute', execute: async (params, context) => callJson(context, `/api/agents/${encodeURIComponent(String(params.agent_id || ''))}`, { method: 'PATCH', body: JSON.stringify(params) }) },
  { id: 'reconcile_effect', name: 'Reconcile Effect Callback', description: 'Mark effect status.', parameters: { effect_id: { type: 'string', required: true, description: 'Effect ID' }, status: { type: 'string', required: true, description: 'Status' } }, riskLevel: 'write', requiredRole: 'effect_callback', execute: async (params, context) => postJson(context, '/api/effect-callback', params) },
];
