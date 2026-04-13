import { NextResponse } from 'next/server';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { handleApiError } from '../../../../lib/security/api-error';
import { resolveIntegrationFromApiKey, upsertIntegrationWebhook } from '../../../../lib/integrations';

export const dynamic = 'force-dynamic';

const WEBHOOK_RATE_LIMIT = 60;
const WEBHOOK_WINDOW_MS = 60_000;

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function POST(request: Request) {
  try {
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, 'integrations-webhooks'),
      limit: WEBHOOK_RATE_LIMIT,
      windowMs: WEBHOOK_WINDOW_MS,
    });

    const headers = buildRateLimitHeaders(rateLimit, WEBHOOK_RATE_LIMIT);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
    }

    const apiKey = extractBearerToken(request);
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Bearer token' }, { status: 401, headers });
    }

    const body = await request.json().catch(() => null);
    const agentId = String(body?.agent_id || '').trim();
    const webhookUrl = String(body?.webhook_url || '').trim();
    const allowedOrigins = body?.allowed_origins;

    if (!agentId || !webhookUrl) {
      return NextResponse.json(
        { error: 'agent_id and webhook_url are required' },
        { status: 400, headers }
      );
    }

    const integration = await resolveIntegrationFromApiKey({
      agentId,
      apiKey,
    });

    if (!integration) {
      return NextResponse.json({ error: 'Invalid agent_id or API key' }, { status: 401, headers });
    }

    const profile = await upsertIntegrationWebhook({
      orgId: integration.orgId,
      agentId: integration.agentId,
      webhookUrl,
      allowedOrigins,
    });

    return NextResponse.json(
      {
        ok: true,
        integration: {
          id: profile.id,
          org_id: profile.org_id,
          agent_id: profile.agent_id,
          webhook_url: profile.webhook_url,
          allowed_origins: profile.allowed_origins,
          status: profile.status,
        },
      },
      { headers }
    );
  } catch (error) {
    return handleApiError('api/integrations/webhooks', error);
  }
}
