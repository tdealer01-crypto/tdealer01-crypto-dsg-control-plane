import { buildGatewayAuditProof } from './audit';
import { executeGatewayProvider } from './providers';
import { evaluateGatewayToolRequest } from './policy';
import { findGatewayTool } from './tool-registry';
import type { GatewayToolExecutionResult, GatewayToolProviderResult, GatewayToolRequest } from './types';

function sanitizeInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  return input as Record<string, unknown>;
}

export function normalizeGatewayToolRequest(raw: unknown, headers: Headers): GatewayToolRequest {
  const body = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

  const header = (name: string) => headers.get(name)?.trim() ?? '';
  const stringField = (name: string) => (typeof body[name] === 'string' ? (body[name] as string).trim() : '');

  return {
    orgId: stringField('orgId') || header('x-org-id'),
    actorId: stringField('actorId') || header('x-actor-id') || header('x-user-id'),
    actorRole: stringField('actorRole') || header('x-actor-role') || header('x-user-role'),
    orgPlan: stringField('orgPlan') || header('x-org-plan') || header('x-plan'),
    planId: stringField('planId') || undefined,
    toolName: stringField('toolName'),
    action: stringField('action'),
    input: sanitizeInput(body.input),
    approvalToken: stringField('approvalToken') || header('x-approval-token') || undefined,
  };
}

export async function executeGatewayTool(request: GatewayToolRequest): Promise<GatewayToolExecutionResult> {
  const registryEntry = await findGatewayTool(request.orgId, request.toolName);
  const policy = evaluateGatewayToolRequest(request, registryEntry);

  if (policy.decision !== 'allow') {
    const audit = buildGatewayAuditProof(request, null, policy.decision, policy.reason);
    return {
      ok: false,
      decision: policy.decision,
      reason: policy.reason,
      registryEntry: registryEntry ?? undefined,
      audit,
    };
  }

  let providerResult: GatewayToolProviderResult;

  try {
    providerResult = await executeGatewayProvider(request, registryEntry ?? undefined);
  } catch (error) {
    providerResult = {
      ok: false,
      provider: registryEntry?.provider ?? 'unknown',
      toolName: request.toolName,
      action: request.action,
      target: request.toolName,
      error: error instanceof Error ? error.message : 'provider_error',
    };
  }

  const audit = buildGatewayAuditProof(
    request,
    providerResult,
    providerResult.ok ? 'allow' : 'block',
    providerResult.error
  );

  return {
    ok: providerResult.ok,
    decision: providerResult.ok ? 'allow' : 'block',
    reason: providerResult.error,
    registryEntry: registryEntry ?? undefined,
    providerResult,
    audit,
  };
}
