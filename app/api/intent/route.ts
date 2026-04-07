import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../lib/authz';
import { issueSpineIntent } from '../../../lib/spine/engine';
import { normalizeSpinePayload } from '../../../lib/spine/request';
import { RuntimeRouteRoles } from '../../../lib/runtime/permissions';
import { handleApiError } from '../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const access = await requireOrgRole(RuntimeRouteRoles.intent);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing Bearer token' }, { status: 401 });
    }

    const apiKey = authHeader.slice(7).trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'Empty API key' }, { status: 401 });
    }

    const payload = normalizeSpinePayload(await request.json().catch(() => null));
    if (!payload.agentId) {
      return NextResponse.json({ error: 'agent_id is required' }, { status: 400 });
    }

    const result = await issueSpineIntent({
      orgId: access.orgId,
      apiKey,
      payload,
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    return handleApiError('api/intent', error);
  }
}
