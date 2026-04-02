import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../lib/authz';
import { RuntimeRouteRoles } from '../../../lib/runtime/permissions';
import { reconcileEffectCallback } from '../../../lib/runtime/reconcile';

export async function POST(request: Request) {
  try {
    const access = await requireOrgRole(RuntimeRouteRoles.effect_callback);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json().catch(() => null);
    const effectId = String(body?.effect_id || '');
    const status = body?.status === 'failed' ? 'failed' : 'succeeded';

    if (!effectId) {
      return NextResponse.json({ error: 'effect_id is required' }, { status: 400 });
    }

    const result = await reconcileEffectCallback({
      effectId,
      orgId: access.orgId,
      status,
      payload: body?.payload ?? {},
    });

    if (!result.found) {
      return NextResponse.json({ error: 'effect_id not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, idempotent: result.alreadyFinal });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
}
