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

export const DSG_TOOLS: AgentTool[] = [
  {
    id: 'readiness',
    name: 'Check System Readiness',
    description: 'Fetch readiness, health, entropy, alerts, and billing state.',
    parameters: {},
    riskLevel: 'read',
    requiredRole: 'monitor',
    execute: async (_params, context) => callJson(context, '/api/core/monitor', { method: 'GET' }),
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
    id: 'audit_summary',
    name: 'Get Runtime Audit Summary',
    description: 'Fetch runtime truth and latest ledger entries for an agent.',
    parameters: {
      agent_id: { type: 'string', required: true, description: 'Agent ID' },
    },
    riskLevel: 'read',
    requiredRole: 'runtime_summary',
    execute: async (params, context) =>
      callJson(context, `/api/runtime-summary?org_id=${encodeURIComponent(context.orgId)}&agent_id=${encodeURIComponent(String(params.agent_id || ''))}`, {
        method: 'GET',
      }),
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
    execute: async (params, context) =>
      callJson(context, '/api/runtime-recovery', {
        method: 'POST',
        body: JSON.stringify({ org_id: context.orgId, agent_id: params.agent_id }),
      }),
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
      policy_id: { type: 'string', required: true, description: 'Policy ID' },
      monthly_limit: { type: 'number', required: false, description: 'Monthly execution limit' },
    },
    riskLevel: 'write',
    requiredRole: 'execute',
    execute: async (params, context) =>
      callJson(context, '/api/agents', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
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
];
