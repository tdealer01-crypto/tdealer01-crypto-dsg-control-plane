import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id || !user.email) {
    return NextResponse.json(
      { ok: false, reason: 'UNAUTHENTICATED' },
      { status: 401 }
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await (admin as any).rpc('dsg_provision_user_access', {
    p_auth_user_id: user.id,
    p_email: user.email,
  });

  if (error) {
    console.error('[provision-access] rpc failed:', error);
    return NextResponse.json(
      {
        ok: false,
        reason: 'PROVISION_FAILED',
        error: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? { ok: false, reason: 'NO_RESULT' });
}
