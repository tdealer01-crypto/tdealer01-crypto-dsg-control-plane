import { resolveGate } from '../gate';
import type { AgentContext } from './context';
import type { AgentTool } from './tools';

function hasExplicitApproval(context: AgentContext) {
  return typeof context.approvalToken === 'string' && context.approvalToken.trim().length >= 8;
}

export async function executeToolSafely(
  tool: AgentTool,
  params: Record<string, unknown>,
  context: AgentContext,
) {
  if (tool.riskLevel === 'read') {
    return tool.execute(params, context);
  }

  if (!hasExplicitApproval(context)) {
    return {
      requiresApproval: true,
      blocked: true,
      reason: 'Plan generated. User approval is required before write or critical agent execution.',
      tool: tool.id,
      params,
    };
  }

  const agentId = String(params.agent_id || '').trim();
  if (!agentId) {
    return {
      blocked: true,
      reason: 'agent_id is required for write or critical runtime tools; empty agent_id is not sent to runtime APIs.',
      tool: tool.id,
    };
  }

  const gate = resolveGate();
  const gateResult = await gate.evaluate({
    agent_id: agentId,
    action: `tool:${tool.id}`,
    payload: {
      params,
      context: { risk_score: tool.riskLevel === 'critical' ? 0.6 : 0.3 },
    },
  });

  if (gateResult.decision === 'BLOCK') {
    return { blocked: true, reason: gateResult.reason };
  }

  if (gateResult.decision === 'STABILIZE') {
    return { stabilized: true, reason: gateResult.reason, requiresApproval: true };
  }

  return tool.execute(params, context);
}
