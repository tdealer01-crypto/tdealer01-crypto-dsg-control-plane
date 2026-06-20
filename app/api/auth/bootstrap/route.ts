import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { ensureUserWorkspace } from '../../../../lib/auth/ensure-user-workspace';
import { handleApiError } from '../../../../lib/security/api-error';

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

    if (!ensured.ok) {
      return NextResponse.json(
        { ok: false, error: ensured.error },
        { status: ensured.status }
      );
    }

    return NextResponse.json({
      ok: true,
      org_id: ensured.profile.org_id,
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
