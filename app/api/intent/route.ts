import { NextResponse } from 'next/server';
import { resolveAgentFromApiKey } from '../../../lib/agent-auth';
import { issueSpineIntent } from '../../../lib/spine/engine';
import { normalizeSpinePayload } from '../../../lib/spine/request';
import { buildCorsHeaders, buildPreflightResponse } from '../../../lib/security/cors';
import { handleApiError } from '../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

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
  try {
    const apiKey = extractBearerToken(request);
    if (!apiKey) {
      return jsonWithHeaders(request, { error: 'Missing Bearer token' }, 401);
    }

    const payload = normalizeSpinePayload(await request.json().catch(() => null));
    if (!payload.agentId) {
      return jsonWithHeaders(request, { error: 'agent_id is required' }, 400);
    }

    const agent = await resolveAgentFromApiKey(payload.agentId, apiKey);
    if (!agent) {
      return jsonWithHeaders(request, { error: 'Invalid agent_id or API key' }, 401);
    }

    if (agent.status !== 'active') {
      return jsonWithHeaders(request, { error: 'Agent is not active' }, 403);
    }

    const result = await issueSpineIntent({
      orgId: String(agent.org_id),
      apiKey,
      payload,
    });

    return NextResponse.json(result.body, {
      status: result.status,
      headers: buildCorsHeaders(request),
    });
  } catch (error) {
    return handleApiError('api/intent', error, {
      headers: buildCorsHeaders(request),
    });
  }
}
