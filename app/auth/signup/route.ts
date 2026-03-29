import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGNUP_RATE_LIMIT_MINUTES = 5;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const workspaceName = String(formData.get('workspace_name') || '').trim();
  const fullNameRaw = String(formData.get('full_name') || '').trim();
  const fullName = fullNameRaw || null;

  const redirectToSignup = new URL('/signup', request.url);

  if (!EMAIL_REGEX.test(email)) {
    redirectToSignup.searchParams.set('error', 'invalid-email');
    return NextResponse.redirect(redirectToSignup, { status: 302 });
  }

  if (!workspaceName) {
    redirectToSignup.searchParams.set('error', 'missing-workspace');
    return NextResponse.redirect(redirectToSignup, { status: 302 });
  }

  try {
    const admin = getSupabaseAdmin();
    const now = new Date();
    const rateLimitBoundary = new Date(
      now.getTime() - SIGNUP_RATE_LIMIT_MINUTES * 60 * 1000
    ).toISOString();

    const { data: existingCompleted, error: completedError } = await admin
      .from('trial_signups')
      .select('id')
      .eq('email', email)
      .eq('status', 'completed')
      .limit(1)
      .maybeSingle();

    if (completedError) {
      throw completedError;
    }

    if (existingCompleted) {
      redirectToSignup.searchParams.set('error', 'already-started');
      return NextResponse.redirect(redirectToSignup, { status: 302 });
    }

    const { data: recentPending, error: pendingError } = await admin
      .from('trial_signups')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .gte('created_at', rateLimitBoundary)
      .limit(1)
      .maybeSingle();

    if (pendingError) {
      throw pendingError;
    }

    if (recentPending) {
      redirectToSignup.searchParams.set('error', 'rate-limited');
      return NextResponse.redirect(redirectToSignup, { status: 302 });
    }

    const { error: insertError } = await admin.from('trial_signups').insert({
      email,
      workspace_name: workspaceName,
      full_name: fullName,
      status: 'pending',
    });

    if (insertError) {
      throw insertError;
    }

    const supabase = await createClient();
    const confirmUrl = new URL('/auth/confirm', request.nextUrl.origin);
    confirmUrl.searchParams.set('next', '/quickstart');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: confirmUrl.toString(),
        shouldCreateUser: true,
      },
    });

    if (error) {
      redirectToSignup.searchParams.set('error', 'send-failed');
      return NextResponse.redirect(redirectToSignup, { status: 302 });
    }

    redirectToSignup.searchParams.set('message', 'check-email');
    return NextResponse.redirect(redirectToSignup, { status: 302 });
  } catch {
    redirectToSignup.searchParams.set('error', 'signup-failed');
    return NextResponse.redirect(redirectToSignup, { status: 302 });
  }
}
