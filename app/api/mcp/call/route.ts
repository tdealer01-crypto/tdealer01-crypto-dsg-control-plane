import { NextResponse } from 'next/server';
import { resolveAgentFromApiKey } from '../../../../lib/agent-auth';
import { requireRuntimeAccess, type RuntimeAccessResult } from '../../../../lib/authz-runtime';
import { requireInternalService } from '../../../../lib/auth/internal-service';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { handleApiError } from '../../../../lib/security/api-error';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
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
    const internal = requireInternalService(request);

    const access: RuntimeAccessResult = internal.ok
      ? {
          ok: true,
          orgId: internal.orgId,
          actorType: 'internal_service',
          grantedRoles: [],
          agentId: internal.agentId,
          workspaceId: internal.workspaceId,
          executionId: internal.executionId,
        }
      : await requireRuntimeAccess(request, 'mcp_call');

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status, headers: buildRateLimitHeaders(rateLimit, MCP_RATE_LIMIT) }
      );
    }

    const body = await request.json().catch(() => null);

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

    const authHeader = request.headers.get('authorization') || '';
    const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    const resolvedAgent = internal.ok
      ? await getSupabaseAdmin()
          .from('agents')
          .select('id, org_id, policy_id, status, monthly_limit')
          .eq('id', request.headers.get('x-agent-id'))
          .eq('org_id', internal.orgId)
          .maybeSingle()
      : apiKey
        ? { data: await resolveAgentFromApiKey(payload.agentId, apiKey), error: null }
        : { data: null, error: null };

    if (!resolvedAgent.data) {
      return NextResponse.json(
        { error: 'Invalid agent identity' },
        { status: 401, headers: buildRateLimitHeaders(rateLimit, MCP_RATE_LIMIT) }
      );
    }

    const intentResult = await issueSpineIntent({
      orgId: access.orgId,
      apiKey: internal.ok ? `internal:${internal.service}` : apiKey,
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
      apiKey: internal.ok ? `internal:${internal.service}` : apiKey,
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
