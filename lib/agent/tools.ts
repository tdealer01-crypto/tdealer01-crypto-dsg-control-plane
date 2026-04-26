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

function hasValue(value: unknown) {
  return typeof value === 'string' ? value.trim().length > 0 : value !== undefined && value !== null;
}

async function callJson(context: AgentContext, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');

  if (context.authHeader) headers.set('authorization', context.authHeader);
  if (context.cookieHeader) headers.set('cookie', context.cookieHeader);

  const response = await fetch(`${context.origin}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = typeof json === 'object' && json && 'error' in json ? String(json.error) : `Tool call failed (${path})`;
    throw new Error(error);
  }

  return json;
}

function mcpCall(context: AgentContext, body: Record<string, unknown>) {
  return callJson(context, '/api/mcp/call', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function simpleTool(args: Omit<AgentTool, 'parameters'> & { parameters?: AgentTool['parameters'] }): AgentTool {
  return { parameters: {}, ...args };
}

export const DSG_TOOLS: AgentTool[] = [
  simpleTool({
    id: 'readiness',
    name: 'Check System Readiness',
    description: 'Fetch production readiness status.',
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (_params, context) => callJson(context, '/api/readiness'),
  }),
  simpleTool({
    id: 'execute_action',
    name: 'Execute Agent Action',
    description: 'Create intent and execute through DSG gate with full audit.',
    riskLevel: 'critical',
    requiredRole: 'execute',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Target agent ID' },
      action: { type: 'string', required: true, description: 'Action name' },
      payload: { type: 'object', required: false, description: 'Action payload' },
    },
    execute: async (params, context) =>
      mcpCall(context, {
        agent_id: params.agent_id,
        action: params.action,
        payload: params.payload || {},
        tool_name: 'agent-chat',
      }),
  }),
  simpleTool({
    id: 'chatbot_message',
    name: 'Chat with Chatbot Agent',
    description: 'Send a chatbot message through the governed DSG execution path.',
    riskLevel: 'critical',
    requiredRole: 'execute',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Target chatbot agent ID' },
      message: { type: 'string', required: true, description: 'Message to send to the chatbot agent' },
    },
    execute: async (params, context) =>
      mcpCall(context, {
        agent_id: params.agent_id,
        action: 'chatbot.message',
        payload: { message: String(params.message || '') },
        tool_name: 'chatbot_message',
      }),
  }),
  simpleTool({
    id: 'browser_navigate',
    name: 'Browser Navigate & Extract',
    description: 'Navigate to a target URL through Browserbase executor.',
    riskLevel: 'critical',
    requiredRole: 'execute',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Target agent ID' },
      url: { type: 'string', required: true, description: 'Target URL to open' },
      extract: { type: 'string', required: false, description: 'Extraction instruction or selector' },
    },
    execute: async (params, context) =>
      mcpCall(context, {
        agent_id: params.agent_id,
        action: 'browser.navigate',
        payload: { url: params.url, extract: params.extract },
        tool_name: 'browser_navigate',
      }),
  }),
  simpleTool({
    id: 'telegram_send',
    name: 'Send Telegram Message',
    description: 'Send a message to Telegram through DSG spine.',
    riskLevel: 'critical',
    requiredRole: 'execute',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Target agent ID' },
      chat_id: { type: 'string', required: true, description: 'Telegram chat ID' },
      text: { type: 'string', required: true, description: 'Message text' },
    },
    execute: async (params, context) =>
      mcpCall(context, {
        agent_id: params.agent_id,
        action: 'social.telegram.send',
        payload: { chat_id: params.chat_id, text: params.text },
        tool_name: 'telegram_send',
      }),
  }),
  simpleTool({
    id: 'audit_summary',
    name: 'Get Runtime Audit Summary',
    description: 'Fetch runtime truth and latest ledger entries for an agent.',
    riskLevel: 'read',
    requiredRole: 'runtime_summary',
    parameters: { agent_id: { type: 'string', required: false, description: 'Agent ID' } },
    execute: async (params, context) => {
      if (!hasValue(params.agent_id)) return callJson(context, '/api/audit?limit=20');
      return callJson(context, `/api/runtime-summary?org_id=${encodeURIComponent(context.orgId)}&agent_id=${encodeURIComponent(String(params.agent_id))}`);
    },
  }),
  simpleTool({
    id: 'checkpoint',
    name: 'Create Runtime Checkpoint',
    description: 'Create a checkpoint hash from latest truth and ledger.',
    riskLevel: 'write',
    requiredRole: 'checkpoint',
    parameters: { agent_id: { type: 'string', required: true, description: 'Agent ID' } },
    execute: async (params, context) =>
      callJson(context, '/api/checkpoint', {
        method: 'POST',
        body: JSON.stringify({ org_id: context.orgId, agent_id: params.agent_id }),
      }),
  }),
  simpleTool({
    id: 'recovery_validate',
    name: 'Validate Runtime Recovery',
    description: 'Validate lineage integrity and missing sequences.',
    riskLevel: 'read',
    requiredRole: 'checkpoint',
    parameters: { agent_id: { type: 'string', required: false, description: 'Agent ID' } },
    execute: async (params, context) => {
      if (!hasValue(params.agent_id)) return callJson(context, '/api/executions?limit=10');
      return callJson(context, '/api/runtime-recovery', {
        method: 'POST',
        body: JSON.stringify({ org_id: context.orgId, agent_id: params.agent_id }),
      });
    },
  }),
  simpleTool({
    id: 'realtime_web_search',
    name: 'Real-time Web Search',
    description: 'Search live online information and return quick references.',
    riskLevel: 'read',
    requiredRole: 'monitor',
    parameters: { query: { type: 'string', required: true, description: 'Search query' } },
    execute: async (params, context) => callJson(context, `/api/realtime-search?q=${encodeURIComponent(String(params.query || ''))}`),
  }),
  simpleTool({ id: 'capacity', name: 'Check Quota & Capacity', description: 'Fetch quota remaining and utilization.', riskLevel: 'read', requiredRole: 'usage_read', execute: async (_params, context) => callJson(context, '/api/capacity') }),
  simpleTool({ id: 'list_agents', name: 'List Agents', description: 'List org agents and current monthly usage.', riskLevel: 'read', requiredRole: 'execute', execute: async (_params, context) => callJson(context, '/api/agents') }),
  simpleTool({
    id: 'create_agent',
    name: 'Create New Agent',
    description: 'Create a new agent with one-time API key return.',
    riskLevel: 'write',
    requiredRole: 'execute',
    parameters: {
      name: { type: 'string', required: true, description: 'Agent name' },
      policy_id: { type: 'string', required: false, description: 'Policy ID' },
      monthly_limit: { type: 'number', required: false, description: 'Monthly execution limit' },
    },
    execute: async (params, context) => {
      const body: Record<string, unknown> = {
        name: String(params.name || 'New Agent'),
        monthly_limit: Number(params.monthly_limit || 10000),
      };
      if (hasValue(params.policy_id)) body.policy_id = String(params.policy_id);
      return callJson(context, '/api/agents', { method: 'POST', body: JSON.stringify(body) });
    },
  }),
  simpleTool({
    id: 'create_chatbot_agent',
    name: 'Create Chatbot Agent',
    description: 'Create a chatbot-ready agent with safe defaults for interactive usage.',
    riskLevel: 'write',
    requiredRole: 'execute',
    parameters: {
      name: { type: 'string', required: false, description: 'Agent name' },
      policy_id: { type: 'string', required: false, description: 'Policy ID' },
      monthly_limit: { type: 'number', required: false, description: 'Monthly execution limit' },
    },
    execute: async (params, context) => {
      const body: Record<string, unknown> = {
        name: String(params.name || 'Chatbot Agent'),
        monthly_limit: Number(params.monthly_limit || 50000),
      };
      if (hasValue(params.policy_id)) body.policy_id = String(params.policy_id);
      return callJson(context, '/api/agents', { method: 'POST', body: JSON.stringify(body) });
    },
  }),
  simpleTool({ id: 'list_policies', name: 'List Policies', description: 'List available policies.', riskLevel: 'read', requiredRole: 'policies_read', execute: async (_params, context) => callJson(context, '/api/policies') }),
  simpleTool({
    id: 'reconcile_effect',
    name: 'Reconcile Effect Callback',
    description: 'Mark effect status as succeeded or failed.',
    riskLevel: 'write',
    requiredRole: 'effect_callback',
    parameters: {
      effect_id: { type: 'string', required: true, description: 'Effect ID' },
      status: { type: 'string', required: true, description: 'succeeded or failed' },
    },
    execute: async (params, context) => callJson(context, '/api/effect-callback', { method: 'POST', body: JSON.stringify(params) }),
  }),
  simpleTool({ id: 'list_executions', name: 'List Executions', description: 'List recent executions for this organization.', riskLevel: 'read', requiredRole: 'monitor', parameters: { limit: { type: 'number', required: false, description: 'Max items' } }, execute: async (params, context) => callJson(context, `/api/executions?limit=${encodeURIComponent(String(params.limit || 10))}`) }),
  simpleTool({ id: 'get_execution_proof', name: 'Get Execution Proof', description: 'Get replay details and proof context for one execution.', riskLevel: 'read', requiredRole: 'monitor', parameters: { execution_id: { type: 'string', required: true, description: 'Execution ID' } }, execute: async (params, context) => callJson(context, `/api/replay/${encodeURIComponent(String(params.execution_id || ''))}`) }),
  simpleTool({ id: 'list_proofs', name: 'List Proofs', description: 'List recent proof artifacts from audit logs.', riskLevel: 'read', requiredRole: 'monitor', parameters: { limit: { type: 'number', required: false, description: 'Max items' } }, execute: async (params, context) => callJson(context, `/api/proofs?limit=${encodeURIComponent(String(params.limit || 20))}`) }),
  simpleTool({ id: 'get_ledger', name: 'Get Ledger', description: 'Get combined ledger and core-ledger snapshot.', riskLevel: 'read', requiredRole: 'monitor', parameters: { limit: { type: 'number', required: false, description: 'Max items' } }, execute: async (params, context) => callJson(context, `/api/ledger?limit=${encodeURIComponent(String(params.limit || 20))}`) }),
  simpleTool({ id: 'get_audit', name: 'Get Audit Events', description: 'Get audit events and determinism checks.', riskLevel: 'read', requiredRole: 'monitor', parameters: { limit: { type: 'number', required: false, description: 'Max items' } }, execute: async (params, context) => callJson(context, `/api/audit?limit=${encodeURIComponent(String(params.limit || 20))}`) }),
  simpleTool({ id: 'get_usage', name: 'Get Usage', description: 'Get current plan usage and projected overage.', riskLevel: 'read', requiredRole: 'usage_read', execute: async (_params, context) => callJson(context, '/api/usage') }),
  simpleTool({ id: 'get_metrics', name: 'Get Metrics', description: 'Get current day control-plane performance metrics.', riskLevel: 'read', requiredRole: 'monitor', execute: async (_params, context) => callJson(context, '/api/metrics') }),
  simpleTool({ id: 'get_integration', name: 'Get Integration Status', description: 'Fetch integration status and source-of-truth posture.', riskLevel: 'read', requiredRole: 'monitor', execute: async (_params, context) => callJson(context, '/api/integration') }),
  simpleTool({ id: 'get_agent_detail', name: 'Get Agent Detail', description: 'Get details and monthly usage for one agent.', riskLevel: 'read', requiredRole: 'execute', parameters: { agent_id: { type: 'string', required: true, description: 'Agent ID' } }, execute: async (params, context) => callJson(context, `/api/agents/${encodeURIComponent(String(params.agent_id || ''))}`) }),
  simpleTool({ id: 'update_agent', name: 'Update Agent', description: 'Update agent metadata, status, policy, or monthly limit.', riskLevel: 'write', requiredRole: 'execute', parameters: { agent_id: { type: 'string', required: true, description: 'Agent ID' } }, execute: async (params, context) => callJson(context, `/api/agents/${encodeURIComponent(String(params.agent_id || ''))}`, { method: 'PATCH', body: JSON.stringify(params) }) }),
  simpleTool({ id: 'rotate_agent_key', name: 'Rotate Agent API Key', description: 'Rotate and return a new one-time API key for an agent.', riskLevel: 'critical', requiredRole: 'execute', parameters: { agent_id: { type: 'string', required: true, description: 'Agent ID' } }, execute: async (params, context) => callJson(context, `/api/agents/${encodeURIComponent(String(params.agent_id || ''))}/rotate-key`, { method: 'POST' }) }),
  simpleTool({ id: 'delete_agent', name: 'Disable Agent', description: 'Disable an agent (soft delete).', riskLevel: 'critical', requiredRole: 'execute', parameters: { agent_id: { type: 'string', required: true, description: 'Agent ID' } }, execute: async (params, context) => callJson(context, `/api/agents/${encodeURIComponent(String(params.agent_id || ''))}`, { method: 'DELETE' }) }),
  simpleTool({ id: 'get_enterprise_proof', name: 'Get Enterprise Proof Report', description: 'Fetch public enterprise proof and attestation report.', riskLevel: 'read', requiredRole: 'monitor', execute: async (_params, context) => callJson(context, '/api/enterprise-proof/report') }),
  simpleTool({ id: 'auto_setup', name: 'Run Org Auto Setup', description: 'Auto-configure default policy, agent, seed execution, billing, onboarding, and runtime roles.', riskLevel: 'critical', requiredRole: 'org_admin', execute: async (_params, context) => callJson(context, '/api/setup/auto', { method: 'POST' }) }),
];
