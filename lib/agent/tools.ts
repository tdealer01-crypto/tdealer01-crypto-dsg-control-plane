import type { AgentExecutionContext } from './context';

export type AgentToolScope = 'read' | 'write' | 'critical';
export type AgentToolPermissionKey =
  | 'intent'
  | 'execute'
  | 'mcp_call'
  | 'checkpoint'
  | 'monitor'
  | 'policies_read'
  | 'policies_write'
  | 'runtime_summary'
  | 'usage_read';

export type AgentTool = {
  id: string;
  title: string;
  description: string;
  method: 'GET' | 'POST';
  path: string;
  scope: AgentToolScope;
  requiredRole: AgentToolPermissionKey;
};

async function invokeHttpTool(
  tool: AgentTool,
  params: Record<string, unknown>,
  context: AgentExecutionContext,
): Promise<unknown> {
  const url = new URL(tool.path, context.origin);
  if (tool.method === 'GET') {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    accept: 'application/json',
  };

  if (tool.method !== 'GET') {
    headers['content-type'] = 'application/json';
  }
  if (context.authHeaders?.cookie) {
    headers.cookie = context.authHeaders.cookie;
  }
  if (context.authHeaders?.authorization) {
    headers.authorization = context.authHeaders.authorization;
  }

  const response = await fetch(url.toString(), {
    method: tool.method,
    headers,
    body: tool.method === 'GET' ? undefined : JSON.stringify(params),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({ error: 'Invalid JSON response' }));
  return {
    ok: response.ok,
    status: response.status,
    tool_id: tool.id,
    data: payload,
  };
}

export const AGENT_TOOLS: AgentTool[] = [
  {
    id: 'list_agents',
    title: 'List Agents',
    description: 'List all agents in the current organization.',
    method: 'GET',
    path: '/api/agents',
    scope: 'read',
    requiredRole: 'monitor',
  },
  {
    id: 'list_policies',
    title: 'List Policies',
    description: 'Read runtime policies available for this organization.',
    method: 'GET',
    path: '/api/policies',
    scope: 'read',
    requiredRole: 'policies_read',
  },
  {
    id: 'create_policy',
    title: 'Create Policy',
    description: 'Create a new runtime policy.',
    method: 'POST',
    path: '/api/policies',
    scope: 'write',
    requiredRole: 'policies_write',
  },
  {
    id: 'submit_intent',
    title: 'Submit Intent',
    description: 'Create a pending runtime intent for an agent action.',
    method: 'POST',
    path: '/api/intent',
    scope: 'write',
    requiredRole: 'intent',
  },
  {
    id: 'execute_action',
    title: 'Execute Action',
    description: 'Execute an approved runtime action for an agent.',
    method: 'POST',
    path: '/api/execute',
    scope: 'critical',
    requiredRole: 'execute',
  },
  {
    id: 'validate_recovery',
    title: 'Validate Runtime Recovery',
    description: 'Validate runtime recovery lineage and checkpoint integrity.',
    method: 'POST',
    path: '/api/runtime-recovery',
    scope: 'read',
    requiredRole: 'checkpoint',
  },
];

export function listAgentTools() {
  return AGENT_TOOLS;
}

export function getAgentTool(toolId: string) {
  return AGENT_TOOLS.find((tool) => tool.id === toolId) ?? null;
}

export async function invokeAgentTool(
  tool: AgentTool,
  params: Record<string, unknown>,
  context: AgentExecutionContext,
): Promise<unknown> {
  return invokeHttpTool(tool, params, context);
}
