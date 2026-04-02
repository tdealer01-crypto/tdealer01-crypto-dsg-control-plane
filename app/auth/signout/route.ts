import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { logSignInEvent } from '../../../lib/auth/sign-in-events';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from('users')
      .select('org_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    await logSignInEvent({
      email: user.email,
      orgId: profile?.org_id || null,
      authUserId: user.id,
      eventType: 'sign_out',
      source: 'auth-signout',
    });
  }

  await supabase.auth.signOut();

  const redirectTo = new URL('/login', request.url);
  redirectTo.searchParams.set('message', 'signed-out');
  return NextResponse.redirect(redirectTo, { status: 302 });
}
