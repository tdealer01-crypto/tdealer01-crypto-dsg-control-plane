import type { ExecutorDispatchParams, ExecutorDispatchResult } from './types';

function getCallbackUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL;
  if (!siteUrl) {
    throw new Error('Missing NEXT_PUBLIC_SITE_URL or APP_URL for executor callback');
  }
  return `${siteUrl.replace(/\/$/, '')}/api/effect-callback`;
}

export async function executeBrowserbaseAction(
  params: ExecutorDispatchParams,
): Promise<ExecutorDispatchResult> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    throw new Error('Browserbase is not configured');
  }

  const response = await fetch('https://api.browserbase.com/v1/sessions', {
    method: 'POST',
    headers: {
      'x-bb-api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      projectId,
      keepAlive: false,
      metadata: {
        effect_id: params.effectId,
        org_id: params.orgId,
        agent_id: params.agentId,
        action: params.action,
      },
      webhookUrl: getCallbackUrl(),
    }),
    cache: 'no-store',
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(body?.error || 'Browserbase session creation failed'));
  }

  return {
    provider: 'browserbase',
    status: 'accepted',
    externalId: typeof body?.id === 'string' ? body.id : undefined,
    callbackMode: 'webhook',
    metadata: {
      session: body,
    },
  };
}
