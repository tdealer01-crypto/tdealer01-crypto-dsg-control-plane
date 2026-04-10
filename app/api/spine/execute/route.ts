import { NextResponse } from 'next/server';
import { resolveAgentFromApiKey } from '../../../../lib/agent-auth';
import { executeSpineIntent, issueSpineIntent } from '../../../../lib/spine/engine';
import { normalizeSpinePayload } from '../../../../lib/spine/request';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { handleApiError } from '../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

const EXECUTE_RATE_LIMIT = 60;
const EXECUTE_RATE_WINDOW_MS = 60 * 1000;

function jsonWithHeaders(
  body: Record<string, unknown>,
  status: number,
  headers: HeadersInit
) {
  return NextResponse.json(body, { status, headers });
}

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function POST(request: Request) {
  let responseHeaders: HeadersInit | undefined;

  try {
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, 'spine-execute'),
      limit: EXECUTE_RATE_LIMIT,
      windowMs: EXECUTE_RATE_WINDOW_MS,
    });

    responseHeaders = buildRateLimitHeaders(rateLimit, EXECUTE_RATE_LIMIT);

    if (!rateLimit.allowed) {
      return jsonWithHeaders({ error: 'Too many requests' }, 429, responseHeaders);
    }

    const apiKey = extractBearerToken(request);
    if (!apiKey) {
      return jsonWithHeaders({ error: 'Missing Bearer token' }, 401, responseHeaders);
    }

    const payload = normalizeSpinePayload(await request.json().catch(() => null));
    if (!payload.agentId) {
      return jsonWithHeaders({ error: 'agent_id is required' }, 400, responseHeaders);
    }

    const agent = await resolveAgentFromApiKey(payload.agentId, apiKey);
    if (!agent) {
      return jsonWithHeaders({ error: 'Invalid agent_id or API key' }, 401, responseHeaders);
    }

    if (agent.status !== 'active') {
      return jsonWithHeaders({ error: 'Agent is not active' }, 403, responseHeaders);
    }

    const orgId = String(agent.org_id);

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

    return NextResponse.json(result.body, {
      status: result.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return handleApiError('api/spine/execute', error, {
      headers: responseHeaders,
    });
  }
}
