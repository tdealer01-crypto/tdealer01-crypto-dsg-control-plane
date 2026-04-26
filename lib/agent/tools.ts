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

async function callJson(
  context: AgentContext,
  path: string,
  init?: RequestInit,
) {
  const response = await fetch(`${context.origin}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: context.authHeader,
      cookie: context.cookieHeader,
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(json.error || `Tool call failed (${path})`));
  }

  return json;
}

function isPresent(value: unknown) {
  return typeof value === 'string' ? value.trim().length > 0 : value !== undefined && value !== null;
}

export const DSG_TOOLS: AgentTool[] = [
  {
    id: 'readiness',
    name: 'Check System Readiness',
    description: 'Fetch production readiness status.',
    parameters: {},
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (_params, context) => callJson(context, '/api/readiness', { method: 'GET' }),
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
      callJson(context, '/api/mcp/call', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: params.agent_id,
          action: params.action,
          payload: params.payload || {},
          tool_name: 'agent-chat',
        }),
      }),
  },
  {
    id: 'chatbot_message',
    name: 'Chat with Chatbot Agent',
    description: 'Send a chatbot message through the governed DSG execution path.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Target chatbot agent ID' },
      message: { type: 'string', required: true, description: 'Message to send to the chatbot agent' },
    },
    riskLevel: 'critical',
    requiredRole: 'execute',
    execute: async (params, context) =>
      callJson(context, '/api/mcp/call', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: params.agent_id,
          action: 'chatbot.message',
          payload: {
            message: String(params.message || ''),
          },
          tool_name: 'chatbot_message',
        }),
      }),
  },
  {
    id: 'browser_navigate',
    name: 'Browser Navigate & Extract',
    description: 'Navigate to a target URL through Browserbase executor.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Target agent ID' },
      url: { type: 'string', required: true, description: 'Target URL to open' },
      extract: { type: 'string', required: false, description: 'Extraction instruction or selector' },
    },
    riskLevel: 'critical',
    requiredRole: 'execute',
    execute: async (params, context) =>
      callJson(context, '/api/mcp/call', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: params.agent_id,
          action: 'browser.navigate',
          payload: {
            url: params.url,
            extract: params.extract,
          },
          tool_name: 'browser_navigate',
        }),
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
      callJson(context, '/api/mcp/call', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: params.agent_id,
          action: 'social.telegram.send',
          payload: {
            chat_id: params.chat_id,
            text: params.text,
          },
          tool_name: 'telegram_send',
        }),
      }),
  },
  {
    id: 'audit_summary',
    name: 'Get Runtime Audit Summary',
    description: 'Fetch runtime truth and latest ledger entries for an agent.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Agent ID' },
    },
    riskLevel: 'read',
    requiredRole: 'runtime_summary',
    execute: async (params, context) => {
      if (!isPresent(params.agent_id)) {
        return callJson(context, '/api/audit?limit=20', { method: 'GET' });
      }
      return callJson(context, `/api/runtime-summary?org_id=${encodeURIComponent(context.orgId)}&agent_id=${encodeURIComponent(String(params.agent_id || ''))}`, {
        method: 'GET',
      });
    },
  },
  {
    id: 'checkpoint',
    name: 'Create Runtime Checkpoint',
    description: 'Create a checkpoint hash from latest truth and ledger.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Agent ID' },
    },
    riskLevel: 'write',
    requiredRole: 'checkpoint',
    execute: async (params, context) =>
      callJson(context, '/api/checkpoint', {
        method: 'POST',
        body: JSON.stringify({ org_id: context.orgId, agent_id: params.agent_id }),
      }),
  },
  {
    id: 'recovery_validate',
    name: 'Validate Runtime Recovery',
    description: 'Validate lineage integrity and missing sequences.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Agent ID' },
    },
    riskLevel: 'read',
    requiredRole: 'checkpoint',
    execute: async (params, context) => {
      if (!isPresent(params.agent_id)) {
        return callJson(context, '/api/executions?limit=10', { method: 'GET' });
      }
      return callJson(context, '/api/runtime-recovery', {
        method: 'POST',
        body: JSON.stringify({ org_id: context.orgId, agent_id: params.agent_id }),
      });
    },
  },
  {
    id: 'realtime_web_search',
    name: 'Real-time Web Search',
    description: 'Search live online information and return quick references.',
    parameters: {
      query: { type: 'string', required: true, description: 'Search query' },
    },
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (params, context) =>
      callJson(
        context,
        `/api/realtime-search?q=${encodeURIComponent(String(params.query || ''))}`,
        { method: 'GET' },
      ),
  },
  {
    id: 'capacity',
    name: 'Check Quota & Capacity',
    description: 'Fetch quota remaining and utilization.',
    parameters: {},
    riskLevel: 'read',
    requiredRole: 'usage_read',
    execute: async (_params, context) => callJson(context, '/api/capacity', { method: 'GET' }),
  },
  {
    id: 'list_agents',
    name: 'List Agents',
    description: 'List org agents and current monthly usage.',
    parameters: {},
    riskLevel: 'read',
    requiredRole: 'execute',
    execute: async (_params, context) => callJson(context, '/api/agents', { method: 'GET' }),
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
      if (isPresent(params.policy_id)) {
        body.policy_id = params.policy_id;
      }
      return callJson(context, '/api/agents', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
  },
  {
    id: 'create_chatbot_agent',
    name: 'Create Chatbot Agent',
    description: 'Create a chatbot-ready agent with safe defaults for interactive usage.',
    parameters: {
      name: { type: 'string', required: false, description: 'Agent name (default: Chatbot Agent)' },
      policy_id: { type: 'string', required: false, description: 'Policy ID (default policy if omitted)' },
      monthly_limit: { type: 'number', required: false, description: 'Monthly execution limit (default: 50000)' },
    },
    riskLevel: 'write',
    requiredRole: 'execute',
    execute: async (params, context) => {
      const body: Record<string, unknown> = {
        name: String(params.name || 'Chatbot Agent'),
        monthly_limit: Number(params.monthly_limit || 50000),
      };
      if (isPresent(params.policy_id)) {
        body.policy_id = params.policy_id;
      }
      return callJson(context, '/api/agents', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
  },
  {
    id: 'list_policies',
    name: 'List Policies',
    description: 'List available policies.',
    parameters: {},
    riskLevel: 'read',
    requiredRole: 'policies_read',
    execute: async (_params, context) => callJson(context, '/api/policies', { method: 'GET' }),
  },
  {
    id: 'reconcile_effect',
    name: 'Reconcile Effect Callback',
    description: 'Mark effect status as succeeded or failed.',
    parameters: {
      effect_id: { type: 'string', required: true, description: 'Effect ID' },
      status: { type: 'string', required: true, description: 'succeeded or failed' },
    },
    riskLevel: 'write',
    requiredRole: 'effect_callback',
    execute: async (params, context) =>
      callJson(context, '/api/effect-callback', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  },

  {
    id: 'list_executions',
    name: 'List Executions',
    description: 'List recent executions for this organization.',
    parameters: {
      limit: { type: 'number', required: false, description: 'Max items (default 10)' },
    },
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (params, context) =>
      callJson(context, `/api/executions?limit=${encodeURIComponent(String(params.limit || 10))}`, { method: 'GET' }),
  },
  {
    id: 'get_execution_proof',
    name: 'Get Execution Proof',
    description: 'Get replay details and proof context for one execution.',
    parameters: {
      execution_id: { type: 'string', required: true, description: 'Execution ID' },
    },
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (params, context) =>
      callJson(context, `/api/replay/${encodeURIComponent(String(params.execution_id || ''))}`, { method: 'GET' }),
  },
  {
    id: 'list_proofs',
    name: 'List Proofs',
    description: 'List recent proof artifacts from audit logs.',
    parameters: {
      limit: { type: 'number', required: false, description: 'Max items (default 20)' },
    },
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (params, context) =>
      callJson(context, `/api/proofs?limit=${encodeURIComponent(String(params.limit || 20))}`, { method: 'GET' }),
  },
  {
    id: 'get_ledger',
    name: 'Get Ledger',
    description: 'Get combined ledger and core-ledger snapshot.',
    parameters: {
      limit: { type: 'number', required: false, description: 'Max items (default 20)' },
    },
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (params, context) =>
      callJson(context, `/api/ledger?limit=${encodeURIComponent(String(params.limit || 20))}`, { method: 'GET' }),
  },
  {
    id: 'get_audit',
    name: 'Get Audit Events',
    description: 'Get audit events and determinism checks.',
    parameters: {
      limit: { type: 'number', required: false, description: 'Max items (default 20)' },
    },
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (params, context) =>
      callJson(context, `/api/audit?limit=${encodeURIComponent(String(params.limit || 20))}`, { method: 'GET' }),
  },
  {
    id: 'get_usage',
    name: 'Get Usage',
    description: 'Get current plan usage and projected overage.',
    parameters: {},
    riskLevel: 'read',
    requiredRole: 'usage_read',
    execute: async (_params, context) => callJson(context, '/api/usage', { method: 'GET' }),
  },
  {
    id: 'get_metrics',
    name: 'Get Metrics',
    description: 'Get current day control-plane performance metrics.',
    parameters: {},
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (_params, context) => callJson(context, '/api/metrics', { method: 'GET' }),
  },
  {
    id: 'get_integration',
    name: 'Get Integration Status',
    description: 'Fetch integration status and source-of-truth posture.',
    parameters: {},
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (_params, context) => callJson(context, '/api/integration', { method: 'GET' }),
  },
  {
    id: 'get_agent_detail',
    name: 'Get Agent Detail',
    description: 'Get details and monthly usage for one agent.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Agent ID' },
    },
    riskLevel: 'read',
    requiredRole: 'execute',
    execute: async (params, context) =>
      callJson(context, `/api/agents/${encodeURIComponent(String(params.agent_id || ''))}`, { method: 'GET' }),
  },
  {
    id: 'update_agent',
    name: 'Update Agent',
    description: 'Update agent metadata, status, policy, or monthly limit.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Agent ID' },
      name: { type: 'string', required: false, description: 'New name' },
      status: { type: 'string', required: false, description: 'active or disabled' },
      policy_id: { type: 'string', required: false, description: 'New policy ID' },
      monthly_limit: { type: 'number', required: false, description: 'New monthly limit' },
    },
    riskLevel: 'write',
    requiredRole: 'execute',
    execute: async (params, context) =>
      callJson(context, `/api/agents/${encodeURIComponent(String(params.agent_id || ''))}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: params.name,
          status: params.status,
          policy_id: params.policy_id,
          monthly_limit: params.monthly_limit,
        }),
      }),
  },
  {
    id: 'rotate_agent_key',
    name: 'Rotate Agent API Key',
    description: 'Rotate and return a new one-time API key for an agent.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Agent ID' },
    },
    riskLevel: 'critical',
    requiredRole: 'execute',
    execute: async (params, context) =>
      callJson(context, `/api/agents/${encodeURIComponent(String(params.agent_id || ''))}/rotate-key`, {
        method: 'POST',
      }),
  },
  {
    id: 'delete_agent',
    name: 'Disable Agent',
    description: 'Disable an agent (soft delete).',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Agent ID' },
    },
    riskLevel: 'critical',
    requiredRole: 'execute',
    execute: async (params, context) =>
      callJson(context, `/api/agents/${encodeURIComponent(String(params.agent_id || ''))}`, {
        method: 'DELETE',
      }),
  },
  {
    id: 'get_enterprise_proof',
    name: 'Get Enterprise Proof Report',
    description: 'Fetch public enterprise proof and attestation report.',
    parameters: {},
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (_params, context) => callJson(context, '/api/enterprise-proof/report', { method: 'GET' }),
  },
  {
    id: 'auto_setup',
    name: 'Run Org Auto Setup',
    description: 'Auto-configure default policy, agent, seed execution, billing, onboarding, and runtime roles.',
    parameters: {},
    riskLevel: 'critical',
    requiredRole: 'org_admin',
    execute: async (_params, context) =>
      callJson(context, '/api/setup/auto', {
        method: 'POST',
      }),
  },
];
