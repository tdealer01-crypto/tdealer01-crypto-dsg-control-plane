import crypto from 'node:crypto';
import type { GatewayToolProviderResult, GatewayToolRequest } from './types';

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(',')}}`;
}

export function hashGatewayValue(value: unknown) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function buildGatewayAuditProof(
  request: GatewayToolRequest,
  providerResult: GatewayToolProviderResult | null,
  decision: string,
  reason?: string
) {
  const requestHash = hashGatewayValue({
    orgId: request.orgId,
    actorId: request.actorId,
    actorRole: request.actorRole,
    orgPlan: request.orgPlan,
    planId: request.planId,
    toolName: request.toolName,
    action: request.action,
    input: request.input,
  });

  const recordHash = hashGatewayValue({
    requestHash,
    decision,
    reason: reason ?? null,
    providerResult: providerResult ?? null,
  });

  return {
    committed: Boolean(providerResult?.ok || decision !== 'allow'),
    requestHash,
    recordHash,
  };
}
