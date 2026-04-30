import type { GatewayToolProviderResult, GatewayToolRequest } from './types';

function zapierEnvKey(toolName: string) {
  return `ZAPIER_WEBHOOK_${toolName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
}

async function executeMockProvider(request: GatewayToolRequest): Promise<GatewayToolProviderResult> {
  return {
    ok: true,
    provider: 'mock',
    toolName: request.toolName,
    action: request.action,
    target: request.toolName,
    result: {
      echoed: request.input,
      deterministic: true,
    },
  };
}

async function executeZapierProvider(request: GatewayToolRequest): Promise<GatewayToolProviderResult> {
  const envKey = zapierEnvKey(request.toolName);
  const webhookUrl = process.env[envKey] || process.env.ZAPIER_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      ok: false,
      provider: 'zapier',
      toolName: request.toolName,
      action: request.action,
      target: envKey,
      error: 'provider_not_configured',
    };
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-dsg-org-id': request.orgId,
      'x-dsg-actor-id': request.actorId,
      'x-dsg-tool-name': request.toolName,
      'x-dsg-action': request.action,
    },
    body: JSON.stringify({
      orgId: request.orgId,
      actorId: request.actorId,
      actorRole: request.actorRole,
      planId: request.planId ?? null,
      toolName: request.toolName,
      action: request.action,
      input: request.input,
    }),
  });

  const text = await response.text();
  let result: Record<string, unknown> = { raw: text };

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { raw: text };
  }

  return {
    ok: response.ok,
    provider: 'zapier',
    toolName: request.toolName,
    action: request.action,
    target: webhookUrl,
    result,
    error: response.ok ? undefined : `provider_http_${response.status}`,
  };
}

export async function executeGatewayProvider(request: GatewayToolRequest): Promise<GatewayToolProviderResult> {
  if (request.toolName.startsWith('mock.')) {
    return executeMockProvider(request);
  }

  if (request.toolName.startsWith('zapier.')) {
    return executeZapierProvider(request);
  }

  return {
    ok: false,
    provider: 'unknown',
    toolName: request.toolName,
    action: request.action,
    target: request.toolName,
    error: 'provider_not_supported',
  };
}
