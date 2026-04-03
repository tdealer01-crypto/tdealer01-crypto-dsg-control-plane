import { resolveGate } from '../gate';
import { RuntimeRouteRoles } from '../runtime/permissions';
import type { AgentExecutionContext } from './context';
import { getAgentTool, invokeAgentTool } from './tools';

export type AgentToolExecutionResult = {
  ok: boolean;
  toolId: string;
  error?: string;
  gate?: {
    decision: string;
    reason: string;
    policy_version: string;
  };
  result?: unknown;
};

function getAgentIdFromParams(params: Record<string, unknown>): string {
  return String(params.agent_id || params.agentId || '');
}

export async function executeToolSafely(
  toolId: string,
  params: Record<string, unknown>,
  context: AgentExecutionContext,
): Promise<AgentToolExecutionResult> {
  const tool = getAgentTool(toolId);
  if (!tool) {
    return { ok: false, toolId, error: 'Unknown tool' };
  }

  const allowed = RuntimeRouteRoles[tool.requiredRole]?.includes(context.role);
  if (!allowed) {
    return { ok: false, toolId: tool.id, error: 'Insufficient role' };
  }

  const agentId = getAgentIdFromParams(params);

  if ((tool.scope === 'write' || tool.scope === 'critical') && agentId) {
    const gate = resolveGate();
    const gateResult = await gate.evaluate({
      agent_id: agentId,
      action: tool.id,
      payload: params,
    });

    if (gateResult.decision !== 'ALLOW') {
      return {
        ok: false,
        toolId: tool.id,
        error: `Gate blocked action: ${gateResult.reason}`,
        gate: {
          decision: gateResult.decision,
          reason: gateResult.reason,
          policy_version: gateResult.policy_version,
        },
      };
    }
  }

  try {
    const result = await invokeAgentTool(tool, params, context);
    return { ok: true, toolId: tool.id, result };
  } catch (error) {
    return {
      ok: false,
      toolId: tool.id,
      error: error instanceof Error ? error.message : 'Tool execution failed',
    };
  }
}
