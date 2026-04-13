import { NextResponse } from 'next/server';
import { provisionIntegration } from '../../../../lib/integrations';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { handleApiError } from '../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

const REGISTER_RATE_LIMIT = 20;
const REGISTER_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  try {
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, 'integrations-register'),
      limit: REGISTER_RATE_LIMIT,
      windowMs: REGISTER_WINDOW_MS,
    });

    const headers = buildRateLimitHeaders(rateLimit, REGISTER_RATE_LIMIT);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
    }

    const body = await request.json().catch(() => null);
    const email = String(body?.email || '').trim();
    const appName = String(body?.app_name || '').trim();

    const result = await provisionIntegration({ email, appName });

    return NextResponse.json(
      {
        ok: true,
        org_id: result.orgId,
        agent_id: result.agentId,
        api_key: result.apiKey,
      },
      { status: 201, headers }
    );
  } catch (error) {
    return handleApiError('api/integrations/register', error);
  }
}
