import { NextResponse } from 'next/server';
import { resolveAgentFromApiKey } from '@/lib/agent-auth';
import { executeSpineIntent, issueSpineIntent } from '@/lib/spine/engine';
import { normalizeSpinePayload } from '@/lib/spine/request';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '@/lib/security/rate-limit';
import { handleApiError } from '@/lib/security/api-error';
import { checkQuota, incrementQuota } from '@/lib/usage/quota';
import { verifySafeDomIntentOrPass } from '@/lib/spine/verify-safe-dom-intent';

export const dynamic = 'force-dynamic';

const EXECUTE_RATE_LIMIT = 60;
const EXECUTE_RATE_WINDOW_MS = 60 * 1000;

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function OPTIONS(request: Request) {
  return buildPreflightResponse(request);
}

export async function POST(request: Request) {
  let responseHeaders: Headers | undefined;

  try {
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, 'spine-execute'),
      limit: EXECUTE_RATE_LIMIT,
      windowMs: EXECUTE_RATE_WINDOW_MS,
    });

    responseHeaders = buildCorsHeaders(
      request,
      buildRateLimitHeaders(rateLimit, EXECUTE_RATE_LIMIT),
    ) as Headers;

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: responseHeaders },
      );
    }

    const apiKey = extractBearerToken(request);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing Bearer token' },
        { status: 401, headers: responseHeaders },
      );
    }

    const payload = normalizeSpinePayload(await request.json().catch(() => null));
    if (!payload.agentId) {
      return NextResponse.json(
        { error: 'agent_id is required' },
        { status: 400, headers: responseHeaders },
      );
    }

    const agent = await resolveAgentFromApiKey(payload.agentId, apiKey);
    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid agent_id or API key' },
        { status: 401, headers: responseHeaders },
      );
    }

    if ((agent as Record<string, unknown>).status !== 'active') {
      return NextResponse.json(
        { error: 'Agent is not active' },
        { status: 403, headers: responseHeaders },
      );
    }

    const orgId = String((agent as Record<string, unknown>).org_id ?? '');
    const quota = await checkQuota(orgId, payload.agentId);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: 'Monthly execution quota exceeded',
          used: quota.used,
          limit: quota.limit,
          upgrade_url: quota.upgradeUrl ?? 'https://app.dsg.pics/pricing',
        },
        { status: 402, headers: responseHeaders },
      );
    }

    const sessionId = String((payload.input as Record<string, unknown>)?.sessionId ?? '');
    const safeDomCheck = await verifySafeDomIntentOrPass(payload, sessionId);
    if (safeDomCheck && safeDomCheck.decision === 'BLOCK') {
      return NextResponse.json(
        {
          error: 'Safe DOM verification failed',
          decision: 'block',
          reason: safeDomCheck.reason,
          element_id: safeDomCheck.elementId,
        },
        { status: 403, headers: responseHeaders },
      );
    }

    if (safeDomCheck && safeDomCheck.decision === 'REVIEW' && safeDomCheck.reason) {
      (payload.context as Record<string, unknown>).safeDomReview = safeDomCheck.reason;
    }

    let result = await executeSpineIntent({ orgId, apiKey, payload });

    if (!result.ok && result.status === 409) {
      await issueSpineIntent({ orgId, apiKey, payload });
      result = await executeSpineIntent({ orgId, apiKey, payload });
    }

    if (result.ok) {
      void incrementQuota(orgId, payload.agentId);
    }

    const responseBody = result.ok
      ? { stop_reason: 'NONE', ...result.body }
      : result.body;
    return NextResponse.json(responseBody, { status: result.status, headers: responseHeaders });
  } catch (error) {
    return handleApiError('api/spine/execute', error, {
      headers: responseHeaders ?? buildCorsHeaders(request),
    });
  }
}
