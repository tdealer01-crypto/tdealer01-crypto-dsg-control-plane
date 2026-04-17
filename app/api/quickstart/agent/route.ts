import { NextResponse } from 'next/server';
import { internalErrorMessage, logApiError } from '../../../../lib/security/api-error';
import { requireActiveProfile } from '../../../../lib/auth/require-active-profile';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { ensureStarterAgent, StarterAgentError } from '../../../../lib/quickstart/starter-agent';

const QUICKSTART_AGENT_RATE_LIMIT = 10;
const QUICKSTART_AGENT_RATE_WINDOW_MS = 60 * 1000;

export async function POST(request: Request) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'quickstart-agent'),
    limit: QUICKSTART_AGENT_RATE_LIMIT,
    windowMs: QUICKSTART_AGENT_RATE_WINDOW_MS,
  });
  const headers = buildRateLimitHeaders(rateLimit, QUICKSTART_AGENT_RATE_LIMIT);

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }

  try {
    const access = await requireActiveProfile();
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status, headers });
    }

    const starterAgent = await ensureStarterAgent(access.orgId);
    return NextResponse.json(starterAgent, { headers });
  } catch (error) {
    if (error instanceof StarterAgentError) {
      if (error.code === 'starter-agent-disabled' || error.code === 'policy-missing') {
        return NextResponse.json({ error: error.message }, { status: 400, headers });
      }
    }

    logApiError('api/quickstart/agent', error, { stage: 'unhandled' });
    return NextResponse.json(
      { error: internalErrorMessage() },
      { status: 500, headers }
    );
  }
}
