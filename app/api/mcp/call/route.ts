import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../lib/authz';
import { RuntimeRouteRoles } from '../../../../lib/runtime/permissions';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';

const MCP_RATE_LIMIT = 30;
const MCP_RATE_WINDOW_MS = 60_000;

function getSanitizedUpstreamError(status: number, upstreamError: unknown, fallback: string) {
  if (status >= 500) {
    return 'Internal server error';
  }
  if (typeof upstreamError === 'string' && upstreamError.trim().length > 0) {
    return upstreamError;
  }
  return fallback;
}

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
    const auth = request.headers.get('authorization') || '';
    const origin = new URL(request.url).origin;

    const intentResp = await fetch(`${origin}/api/intent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: auth },
      body: JSON.stringify({ agent_id: body?.agent_id, org_id: access.orgId, intent: { action: body?.action, payload: body?.payload ?? {} } }),
    });

    const intentJson = await intentResp.json().catch(() => ({}));
    if (!intentResp.ok) {
      return NextResponse.json(
        { error: getSanitizedUpstreamError(intentResp.status, intentJson?.error, 'Intent request failed') },
        { status: intentResp.status, headers: buildRateLimitHeaders(rateLimit, MCP_RATE_LIMIT) }
      );
    }

    const executeResp = await fetch(`${origin}/api/execute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: auth },
      body: JSON.stringify({
        agent_id: body?.agent_id,
        action: body?.action || 'mcp-call',
        input: body?.payload ?? {},
        context: { source: 'mcp', intent_request_id: intentJson.request_id },
      }),
    });

    const executeJson = await executeResp.json().catch(() => ({}));
    if (!executeResp.ok) {
      return NextResponse.json(
        { error: getSanitizedUpstreamError(executeResp.status, executeJson?.error, 'Execution failed') },
        { status: executeResp.status, headers: buildRateLimitHeaders(rateLimit, MCP_RATE_LIMIT) }
      );
    }

    return NextResponse.json(
      {
        runtime: executeJson,
        dispatch: {
          tool_name: body?.tool_name || 'unknown-tool',
          dispatched: executeJson.decision === 'ALLOW',
          bypass_prevented: true,
        },
      },
      { headers: buildRateLimitHeaders(rateLimit, MCP_RATE_LIMIT) }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
