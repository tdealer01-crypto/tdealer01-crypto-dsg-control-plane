import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../lib/authz';
import { executeSpineIntent, issueSpineIntent } from '../../../../lib/spine/engine';
import { normalizeSpinePayload } from '../../../../lib/spine/request';
import { RuntimeRouteRoles } from '../../../../lib/runtime/permissions';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { handleApiError } from '../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

const EXECUTE_RATE_LIMIT = 60;
const EXECUTE_RATE_WINDOW_MS = 60 * 1000;

export async function POST(request: Request) {
  try {
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, 'spine-execute'),
      limit: EXECUTE_RATE_LIMIT,
      windowMs: EXECUTE_RATE_WINDOW_MS,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: buildRateLimitHeaders(rateLimit, EXECUTE_RATE_LIMIT) }
      );
    }

    const access = await requireOrgRole(RuntimeRouteRoles.execute);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status, headers: buildRateLimitHeaders(rateLimit, EXECUTE_RATE_LIMIT) }
      );
    }

    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing Bearer token' },
        { status: 401, headers: buildRateLimitHeaders(rateLimit, EXECUTE_RATE_LIMIT) }
      );
    }

    const apiKey = authHeader.slice(7).trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Empty API key' },
        { status: 401, headers: buildRateLimitHeaders(rateLimit, EXECUTE_RATE_LIMIT) }
      );
    }

    const payload = normalizeSpinePayload(await request.json().catch(() => null));
    if (!payload.agentId) {
      return NextResponse.json(
        { error: 'agent_id is required' },
        { status: 400, headers: buildRateLimitHeaders(rateLimit, EXECUTE_RATE_LIMIT) }
      );
    }

    let result = await executeSpineIntent({
      orgId: access.orgId,
      apiKey,
      payload,
    });

    if (!result.ok && result.status === 409 && result.body?.error === 'No pending runtime intent for request') {
      const issued = await issueSpineIntent({
        orgId: access.orgId,
        apiKey,
        payload,
      });

      if (!issued.ok) {
        return NextResponse.json(issued.body, {
          status: issued.status,
          headers: buildRateLimitHeaders(rateLimit, EXECUTE_RATE_LIMIT),
        });
      }

      result = await executeSpineIntent({
        orgId: access.orgId,
        apiKey,
        payload,
      });
    }

    return NextResponse.json(result.body, {
      status: result.status,
      headers: buildRateLimitHeaders(rateLimit, EXECUTE_RATE_LIMIT),
    });
  } catch (error) {
    return handleApiError('api/spine/execute', error);
  }
}
