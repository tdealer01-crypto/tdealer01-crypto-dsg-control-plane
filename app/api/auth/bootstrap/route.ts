import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { ensureUserWorkspace, isWorkspaceFailure } from '../../../../lib/auth/ensure-user-workspace';
import { handleApiError } from '../../../../lib/security/api-error';
import { captureEvent } from '../../../../lib/telemetry/capture-event';

export const dynamic = 'force-dynamic';

async function bootstrap() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const ensured = await ensureUserWorkspace(getSupabaseAdmin(), {
      authUserId: user.id,
      email: user.email || null,
    });

    if (isWorkspaceFailure(ensured)) {
      return NextResponse.json(
        { ok: false, error: ensured.error },
        { status: ensured.status }
      );
    }

    const orgId = ensured.profile.org_id;

    // Capture organization_created if this is first bootstrap (bootstrapped = true means org was just created)
    if (ensured.bootstrapped) {
      await captureEvent('organization_created', {
        userId: user.id,
        organizationId: orgId,
      }, {
        organization_id: orgId,
        organization_name: null,
        plan_tier: 'free',
        created_by_user_id: user.id,
      });
    }

    return NextResponse.json({
      ok: true,
      org_id: orgId,
      is_active: ensured.profile.is_active,
      bootstrapped: ensured.bootstrapped,
    });
  } catch (error) {
    return handleApiError('api/auth/bootstrap', error);
  }
}

export async function GET() {
  return bootstrap();
}

export async function POST() {
  return bootstrap();
}
