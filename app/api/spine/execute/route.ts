import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { resolveAgentFromApiKey } from '../../../../lib/agent-auth';
import { executeSpineIntent, issueSpineIntent } from '../../../../lib/spine/engine';
import { normalizeSpinePayload } from '../../../../lib/spine/request';
import { buildCorsHeaders, buildPreflightResponse } from '../../../../lib/security/cors';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { handleApiError } from '../../../../lib/security/api-error';
import { checkQuota, incrementQuota } from '../../../../lib/usage/quota';
import { fireWebhook } from '../../../../lib/webhooks/deliver';
import { meterExecution } from '../../../../lib/billing/metered';
import { verifySafeDomIntentOrPass } from '../../../../lib/spine/verify-safe-dom-intent';

export const dynamic = 'force-dynamic';

const EXECUTE_RATE_LIMIT = 60;
const EXECUTE_RATE_WINDOW_MS = 60 * 1000;

function jsonWithHeaders(
  request: Request,
  body: Record<string, unknown>,
  status: number,
  extraHeaders?: HeadersInit
) {
  return NextResponse.json(body, {
    status,
    headers: buildCorsHeaders(request, extraHeaders),
  });
}

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
      buildRateLimitHeaders(rateLimit, EXECUTE_RATE_LIMIT)
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: responseHeaders }
      );
    }

    const apiKey = extractBearerToken(request);
    if (!apiKey) {
      return jsonWithHeaders(request, { error: 'Missing Bearer token' }, 401, responseHeaders);
    }

    const payload = normalizeSpinePayload(await request.json().catch(() => null));
    if (!payload.agentId) {
      return jsonWithHeaders(request, { error: 'agent_id is required' }, 400, responseHeaders);
    }

    const agent = await resolveAgentFromApiKey(payload.agentId, apiKey);
    if (!agent) {
      return jsonWithHeaders(request, { error: 'Invalid agent_id or API key' }, 401, responseHeaders);
    }

    if (agent.status !== 'active') {
      return jsonWithHeaders(request, { error: 'Agent is not active' }, 403, responseHeaders);
    }

    const orgId = String(agent.org_id);
    const agentId = String(agent.id);

    // Quota gate: check before executing (read-only, safe to run first)
    const quota = await checkQuota(orgId, agentId);
    if (!quota.allowed) {
      return jsonWithHeaders(
        request,
        {
          error: 'Monthly execution quota exceeded',
          used: quota.used,
          limit: quota.limit,
          upgrade_url: quota.upgradeUrl,
        },
        402,
        responseHeaders
      );
    }

    // Safe DOM verification (new)
    // Verify that Safe DOM commands only target exposed elements in the manifest
    const sessionId = String(payload.context.sessionId || payload.input.sessionId || '');
    const safeDomVerification = await verifySafeDomIntentOrPass(payload, sessionId);
    if (safeDomVerification) {
      // Safe DOM verification returned a result (either BLOCK or REVIEW)
      if (safeDomVerification.decision === 'BLOCK') {
        return jsonWithHeaders(
          request,
          {
            error: 'Safe DOM verification failed',
            reason: safeDomVerification.reason,
            element_id: safeDomVerification.elementId,
            decision: 'block',
          },
          403,
          responseHeaders
        );
      }
      // REVIEW decision falls through to normal gate/approval flow with verification metadata
      if (safeDomVerification.decision === 'REVIEW') {
        // Continue with execution but the pipeline will note the REVIEW status
        payload.context.safeDomReview = safeDomVerification.reason;
      }
    }

    let result = await executeSpineIntent({
      orgId,
      apiKey,
      payload,
    });

    if (
      !result.ok &&
      result.status === 409 &&
      result.body?.error === 'No pending runtime intent for request'
    ) {
      const issued = await issueSpineIntent({
        orgId,
        apiKey,
        payload,
      });

      if (!issued.ok) {
        return NextResponse.json(issued.body, {
          status: issued.status,
          headers: responseHeaders,
        });
      }

      result = await executeSpineIntent({
        orgId,
        apiKey,
        payload,
      });
    }

    // Count executions only on success (2xx)
    if (result.status >= 200 && result.status < 300) {
      void incrementQuota(orgId, agentId);
      void fireWebhook(orgId, 'execution.completed', {
        agent_id: agentId,
        decision: (result.body as Record<string, unknown>)?.decision ?? null,
      });
      const executionId =
        ((result.body as Record<string, unknown>)?.execution_id as string | undefined) ??
        randomUUID();
      void meterExecution(orgId, 1, executionId);
    }

    return NextResponse.json(result.body, {
      status: result.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return handleApiError('api/spine/execute', error, {
      headers: responseHeaders ?? buildCorsHeaders(request),
    });
  }
}
