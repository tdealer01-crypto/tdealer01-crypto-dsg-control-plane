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
import { createLogger, generateRequestId, extractRequestContext } from '../../../../lib/security/structured-logger';
import { TimingTracker } from '../../../../lib/security/api-middleware';

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
  const requestId = generateRequestId();
  const timing = new TimingTracker();
  const baseContext = extractRequestContext(request);
  const logger = createLogger({
    requestId,
    endpoint: '/api/spine/execute',
    ...baseContext,
  });

  let responseHeaders: Headers | undefined;

  try {
    timing.mark('rate-limit-start');
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, 'spine-execute'),
      limit: EXECUTE_RATE_LIMIT,
      windowMs: EXECUTE_RATE_WINDOW_MS,
    });
    const rateLimitDuration = timing.durationSince('rate-limit-start');

    responseHeaders = buildCorsHeaders(
      request,
      buildRateLimitHeaders(rateLimit, EXECUTE_RATE_LIMIT)
    );

    logger.debug('Rate limit check', {
      allowed: rateLimit.allowed,
      duration: rateLimitDuration,
      remaining: rateLimit.remaining,
    });

    if (!rateLimit.allowed) {
      logger.warn('Rate limit exceeded', {
        key: getRateLimitKey(request, 'spine-execute'),
      });
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: responseHeaders }
      );
    }

    const apiKey = extractBearerToken(request);
    if (!apiKey) {
      logger.logSecurityEvent('Missing API key in request', 'warn');
      return jsonWithHeaders(request, { error: 'Missing Bearer token' }, 401, responseHeaders);
    }

    timing.mark('payload-parse-start');
    let payload;
    try {
      payload = normalizeSpinePayload(await request.json().catch(() => null));
    } catch (parseError) {
      logger.warn('Failed to parse request payload', { error: parseError });
      return jsonWithHeaders(request, { error: 'Invalid request payload' }, 400, responseHeaders);
    }
    const parseDuration = timing.durationSince('payload-parse-start');
    logger.debug('Payload parsed', { duration: parseDuration });

    if (!payload.agentId) {
      logger.warn('Missing required agent_id field');
      return jsonWithHeaders(request, { error: 'agent_id is required' }, 400, responseHeaders);
    }

    timing.mark('agent-lookup-start');
    const agent = await resolveAgentFromApiKey(payload.agentId, apiKey);
    const agentLookupDuration = timing.durationSince('agent-lookup-start');
    logger.debug('Agent lookup completed', {
      duration: agentLookupDuration,
      found: !!agent,
    });

    if (!agent) {
      logger.logSecurityEvent('Invalid agent_id or API key', 'warn', {
        agentId: payload.agentId,
      });
      return jsonWithHeaders(request, { error: 'Invalid agent_id or API key' }, 401, responseHeaders);
    }

    const orgId = String(agent.org_id);
    const agentId = String(agent.id);

    logger.withContext({ agentId, orgId });

    if (agent.status !== 'active') {
      logger.logSecurityEvent('Agent not active', 'warn', {
        agentId,
        status: agent.status,
      });
      return jsonWithHeaders(request, { error: 'Agent is not active' }, 403, responseHeaders);
    }

    // Quota gate: check before executing (read-only, safe to run first)
    timing.mark('quota-check-start');
    const quota = await checkQuota(orgId, agentId);
    const quotaDuration = timing.durationSince('quota-check-start');
    logger.debug('Quota check completed', {
      duration: quotaDuration,
      allowed: quota.allowed,
      used: quota.used,
      limit: quota.limit,
    });

    if (!quota.allowed) {
      logger.warn('Quota exceeded', {
        used: quota.used,
        limit: quota.limit,
      });
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

    timing.mark('execute-intent-start');
    let result = await executeSpineIntent({
      orgId,
      apiKey,
      payload,
    });
    let executeDuration = timing.durationSince('execute-intent-start');

    if (
      !result.ok &&
      result.status === 409 &&
      result.body?.error === 'No pending runtime intent for request'
    ) {
      logger.debug('No pending intent found, issuing new one');

      timing.mark('issue-intent-start');
      const issued = await issueSpineIntent({
        orgId,
        apiKey,
        payload,
      });
      const issueDuration = timing.durationSince('issue-intent-start');
      logger.debug('Intent issued', {
        duration: issueDuration,
        success: issued.ok,
        status: issued.status,
      });

      if (!issued.ok) {
        logger.warn('Failed to issue spine intent', {
          status: issued.status,
          error: issued.body?.error,
        });
        return NextResponse.json(issued.body, {
          status: issued.status,
          headers: responseHeaders,
        });
      }

      timing.mark('execute-intent-retry-start');
      result = await executeSpineIntent({
        orgId,
        apiKey,
        payload,
      });
      executeDuration = timing.durationSince('execute-intent-retry-start');
    }

    logger.info('Spine intent executed', {
      status: result.status,
      duration: executeDuration,
      success: result.ok,
    });

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

      logger.info('Execution recorded and metrics updated', {
        executionId,
      });
    }

    const totalDuration = timing.duration();
    logger.logApiRequest(request.method, '/api/spine/execute', result.status, totalDuration);

    return NextResponse.json(result.body, {
      status: result.status,
      headers: {
        ...Object.fromEntries(responseHeaders ?? new Headers()),
        'X-Request-ID': requestId,
        'X-Response-Time': `${totalDuration}ms`,
      },
    });
  } catch (error) {
    logger.error('Spine execute handler error', error, {
      totalDuration: timing.duration(),
    });

    return handleApiError('api/spine/execute', error, {
      requestId,
      headers: responseHeaders ?? buildCorsHeaders(request),
    });
  }
}
