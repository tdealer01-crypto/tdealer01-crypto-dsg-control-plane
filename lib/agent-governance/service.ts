import { randomUUID } from 'crypto';
import { getAdminDb } from './db';
import { planMessage } from './planner';
import { resolvePolicyDecision } from './policy';
import type {
  AgentExecuteBody,
  AgentStep,
  ExecutionProof,
  ToolName,
} from './types';

type DispatchResult = { ok: boolean; data?: unknown; error?: string };

type ExecutionRequestRow = {
  id: string;
  workspace_id: string;
  org_id: string;
  provider: string;
  agent_id: string;
  status: string;
};

type ExecutionStepRow = {
  id: string;
  step_index: number;
  tool: ToolName;
  policy_mode: AgentStep['policy_mode'];
  status: AgentStep['status'];
  result: unknown;
  error: string | null;
};

async function dispatchTool(args: {
  origin: string;
  internalAuthToken: string;
  executionId: string;
  workspaceId: string;
  orgId: string;
  agentId: string;
  tool: ToolName;
  params: Record<string, unknown>;
}): Promise<DispatchResult> {
  const headers = {
    'content-type': 'application/json',
    'x-org-id': args.orgId,
    'x-workspace-id': args.workspaceId,
    'x-agent-id': args.agentId,
    'x-execution-id': args.executionId,
    'x-internal-service': 'agent-governance-v3',
    authorization: `Bearer ${args.internalAuthToken}`,
  };

  const fetchJson = async (path: string, init: RequestInit): Promise<DispatchResult> => {
    const res = await fetch(`${args.origin}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...(init.headers ?? {}),
      },
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      data,
      error: res.ok ? undefined : (data as { error?: string })?.error ?? 'request_failed',
    };
  };

  switch (args.tool) {
    case 'readiness':
      return fetchJson('/api/core/monitor', { method: 'GET' });
    case 'capacity':
      return fetchJson('/api/capacity', { method: 'GET' });
    case 'usage':
      return fetchJson('/api/usage', { method: 'GET' });
    case 'audit_summary':
      return fetchJson('/api/runtime-summary', { method: 'GET' });
    case 'checkpoint':
      return fetchJson('/api/checkpoint', { method: 'POST', body: JSON.stringify(args.params) });
    case 'recovery_validate':
      return fetchJson('/api/runtime-recovery', { method: 'POST', body: JSON.stringify(args.params) });
    case 'list_agents':
      return fetchJson('/api/agents', { method: 'GET' });
    case 'create_agent':
      return fetchJson('/api/agents', { method: 'POST', body: JSON.stringify(args.params) });
    case 'list_policies':
      return fetchJson('/api/policies', { method: 'GET' });
    case 'reconcile_effect':
      return fetchJson('/api/effect-callback', { method: 'POST', body: JSON.stringify(args.params) });
    case 'execute_action':
    case 'browser_navigate':
    case 'telegram_send':
      return fetchJson('/api/mcp/call', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: args.agentId,
          action: args.tool,
          payload: args.params,
          tool_name: args.tool,
        }),
      });
    case 'auto_setup':
      return fetchJson('/api/setup/auto', { method: 'POST', body: JSON.stringify(args.params) });
    default:
      return { ok: false, error: 'unsupported_tool' };
  }
}

export async function createExecutionRequest(body: AgentExecuteBody) {
  const db = getAdminDb();
  const id = randomUUID();
  const steps = body.plan ?? planMessage(body.message ?? '');

  await db.from('agent_execution_requests').insert({
    id,
    workspace_id: body.workspace_id,
    org_id: body.org_id,
    provider: body.provider,
    agent_id: body.agent_id,
    status: 'pending',
  });

  if (steps.length > 0) {
    await db.from('agent_execution_steps').insert(
      steps.map((step) => ({
        execution_id: id,
        step_index: step.step_index,
        tool: step.tool,
        policy_mode: resolvePolicyDecision(step),
        status: step.status,
        input: step.params,
      })),
    );
  }

  return { id, steps };
}

export async function planExecution(message: string) {
  return planMessage(message);
}

export async function runStep(args: {
  origin: string;
  internalAuthToken: string;
  executionId: string;
  workspaceId: string;
  orgId: string;
  agentId: string;
  step: AgentStep;
}) {
  return dispatchTool({
    origin: args.origin,
    internalAuthToken: args.internalAuthToken,
    executionId: args.executionId,
    workspaceId: args.workspaceId,
    orgId: args.orgId,
    agentId: args.agentId,
    tool: args.step.tool,
    params: args.step.params,
  });
}

export async function getExecutionProof(executionId: string): Promise<ExecutionProof | null> {
  const db = getAdminDb();
  const { data: request } = await db
    .from('agent_execution_requests')
    .select('id, workspace_id, org_id, provider, agent_id, status')
    .eq('id', executionId)
    .maybeSingle();

  if (!request) return null;

  const { data: steps } = await db
    .from('agent_execution_steps')
    .select('id, step_index, tool, policy_mode, status, result, error')
    .eq('execution_id', executionId)
    .order('step_index', { ascending: true });

  const { data: approvals } = await db
    .from('agent_execution_approvals')
    .select('step_id, status')
    .eq('execution_id', executionId);

  const approvalMap = new Map<string, string>();
  for (const approval of approvals ?? []) {
    approvalMap.set(String(approval.step_id), String(approval.status));
  }

  const requestRow = request as ExecutionRequestRow;
  const stepRows = (steps ?? []) as ExecutionStepRow[];

  return {
    execution_id: requestRow.id,
    workspace_id: requestRow.workspace_id,
    org_id: requestRow.org_id,
    provider: requestRow.provider,
    agent_id: requestRow.agent_id,
    status: requestRow.status,
    steps: stepRows.map((step) => ({
      step_index: step.step_index,
      tool: step.tool,
      policy_mode: step.policy_mode,
      status: step.status,
      approval_status: approvalMap.get(step.id) as 'pending' | 'approved' | 'rejected' | undefined,
      result: step.result,
      error: step.error ?? undefined,
    })),
    audit_refs: [`agent_execution_events:${executionId}`],
    ledger_refs: [`runtime_commit_execution.request:${executionId}`],
    usage_refs: [`usage_counter.request:${executionId}`],
  };
}
