import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../lib/authz';
import { RuntimeRouteRoles } from '../../../../lib/runtime/permissions';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { handleApiError } from '../../../../lib/security/api-error';
import { issueSpineIntent, executeSpineIntent } from '../../../../lib/spine/engine';
import { normalizeSpinePayload } from '../../../../lib/spine/request';

const MCP_RATE_LIMIT = 30;
const MCP_RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  try {
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, 'mcp-call'),
      limit: MCP_RATE_LIMIT,
      windowMs: MCP_RATE_WINDOW_MS,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: buildRateLimitHeaders(rateLimit, MCP_RATE_LIMIT) }
      );
    }
    const access = await requireOrgRole(RuntimeRouteRoles.mcp_call);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status, headers: buildRateLimitHeaders(rateLimit, MCP_RATE_LIMIT) }
      );
    }

    const body = await request.json().catch(() => null);

    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing Bearer token' },
        { status: 401, headers: buildRateLimitHeaders(rateLimit, MCP_RATE_LIMIT) }
      );
    }

    const apiKey = authHeader.slice(7).trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Empty API key' },
        { status: 401, headers: buildRateLimitHeaders(rateLimit, MCP_RATE_LIMIT) }
      );
    }

    const payload = normalizeSpinePayload({
      agent_id: body?.agent_id,
      action: body?.action || 'mcp-call',
      input: body?.payload ?? {},
      context: {
        source: 'mcp',
      },
    });

    if (!payload.agentId) {
      return NextResponse.json(
        { error: 'agent_id is required' },
        { status: 400, headers: buildRateLimitHeaders(rateLimit, MCP_RATE_LIMIT) }
      );
    }

    const intentResult = await issueSpineIntent({
      orgId: access.orgId,
      apiKey,
      payload,
    });

    if (!intentResult.ok) {
      return NextResponse.json(intentResult.body, {
        status: intentResult.status,
        headers: buildRateLimitHeaders(rateLimit, MCP_RATE_LIMIT),
      });
    }

    const executeResult = await executeSpineIntent({
      orgId: access.orgId,
      apiKey,
      payload,
    });

    if (!executeResult.ok) {
      return NextResponse.json(executeResult.body, {
        status: executeResult.status,
        headers: buildRateLimitHeaders(rateLimit, MCP_RATE_LIMIT),
      });
    }

    return NextResponse.json(
      {
        runtime: executeResult.body,
        dispatch: {
          tool_name: body?.tool_name || 'unknown-tool',
          dispatched: executeResult.body?.decision === 'ALLOW',
          bypass_prevented: true,
        },
      },
      { headers: buildRateLimitHeaders(rateLimit, MCP_RATE_LIMIT) }
    );
  } catch (error) {
    return handleApiError('api/mcp/call', error);
  }
}
