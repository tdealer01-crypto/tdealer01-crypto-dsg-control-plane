import { createHash } from 'crypto';
import { resolveGate } from '../gate';
import { evaluateHermesPluginRequest, type HermesMode } from '../dsg/hermes-plugin';
import type { AgentContext } from './context';
import type { AgentTool } from './tools';

function hasExplicitApproval(context: AgentContext) {
  return typeof context.approvalToken === 'string' && context.approvalToken.trim().length >= 8;
}

function toolToHermesMode(toolId: string): HermesMode {
  return toolId === 'browser_navigate' ? 'browser_qa' : 'gated_executor';
}

function roleToHermesRole(role: AgentContext['role']): HermesPluginContext['role'] {
  return role === 'org_admin' ? 'admin' : 'operator';
}

function roleToPermissions(role: AgentContext['role']): string[] {
  return role === 'org_admin'
    ? ['tool:execute_low', 'tool:execute_medium', 'tool:execute_high', 'tool:execute_critical']
    : ['tool:execute_low', 'tool:execute_medium'];
}

type HermesPluginContext = Parameters<typeof evaluateHermesPluginRequest>[0]['context'];

function postHermesResult(
  context: AgentContext,
  envelope: NonNullable<ReturnType<typeof evaluateHermesPluginRequest>['actionEnvelope']>,
  result: unknown,
  startedAt: string,
): void {
  const completedAt = new Date().toISOString();
  const observedResultHash = createHash('sha256')
    .update(JSON.stringify(result ?? null))
    .digest('hex');
  const body = {
    workspaceId: envelope.workspaceId,
    agentId: envelope.agentId,
    sessionId: envelope.sessionId,
    commandId: envelope.commandId,
    envelopeId: envelope.envelopeId,
    decisionHash: envelope.decisionHash,
    status: 'SUCCESS',
    startedAt,
    completedAt,
    observedResultHash,
    evidenceItemIds: [`observe:${envelope.envelopeId}`],
  };
  fetch(`${context.origin}${envelope.mustReturnResultTo}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: context.authHeader,
      cookie: context.cookieHeader,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  }).catch(() => {
    // fire-and-forget — result callback failure does not block the caller
  });
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

  // For system tools that operate on sandboxed resources (code write/run) rather than
  // a specific agent, fall back to the org ID so the Hermes gate can still run.
  const agentId = String(params.agent_id || context.orgId || '').trim();
  if (!agentId) {
    return {
      blocked: true,
      reason: 'agent_id is required for write or critical runtime tools; empty agent_id is not sent to runtime APIs.',
      tool: tool.id,
    };
  }

  const hermesResult = evaluateHermesPluginRequest({
    mode: toolToHermesMode(tool.id),
    commandText: tool.id,
    prompt: `Execute tool: ${tool.name}`,
    path: typeof params.url === 'string' ? params.url : undefined,
    url: typeof params.url === 'string' ? params.url : undefined,
    payload: params,
    context: {
      workspaceId: context.orgId,
      actorId: agentId,
      role: roleToHermesRole(context.role),
      permissions: roleToPermissions(context.role),
      proof: context.hermesProof,
    },
  });

  if (!hermesResult.canExecute) {
    return {
      blocked: true,
      hermesDecision: hermesResult.decision,
      hermesStatus: hermesResult.status,
      reason: hermesResult.preflightBlock?.reason
        ?? `DSG Hermes gate: ${hermesResult.reasons.slice(0, 3).join(', ')}`,
      reasons: hermesResult.reasons,
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

  const startedAt = new Date().toISOString();
  const result = await tool.execute(params, context);

  if (hermesResult.actionEnvelope) {
    postHermesResult(context, hermesResult.actionEnvelope, result, startedAt);
  }

  return result;
}
