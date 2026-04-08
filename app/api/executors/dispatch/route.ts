import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../lib/authz';
import { RuntimeRouteRoles } from '../../../../lib/runtime/permissions';
import { handleApiError } from '../../../../lib/security/api-error';
import { dispatchExecutor } from '../../../../lib/executors';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const access = await requireOrgRole(RuntimeRouteRoles.execute);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json().catch(() => null);
    const agentId = String(body?.agent_id || '').trim();
    const action = String(body?.action || '').trim();
    const payload = body?.payload && typeof body.payload === 'object' ? body.payload : {};
    const effectId = String(body?.effect_id || randomUUID());

    if (!agentId || !action) {
      return NextResponse.json({ error: 'agent_id and action are required' }, { status: 400 });
    }

    const dispatch = await dispatchExecutor({
      orgId: access.orgId,
      agentId,
      action,
      payload: payload as Record<string, unknown>,
      effectId,
    });

    return NextResponse.json({
      effect_id: effectId,
      dispatched: true,
      ...dispatch,
    });
  } catch (error) {
    return handleApiError('api/executors/dispatch', error);
  }
}
