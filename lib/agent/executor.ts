import { resolveGate } from '../gate';
import type { AgentContext } from './context';
import type { AgentTool } from './tools';

export async function executeToolSafely(
  tool: AgentTool,
  params: Record<string, unknown>,
  context: AgentContext,
) {
  if (tool.riskLevel === 'read') {
    return tool.execute(params, context);
  }

  const gate = resolveGate();
  const gateResult = await gate.evaluate({
    agent_id: String(params.agent_id || 'operator-console'),
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
