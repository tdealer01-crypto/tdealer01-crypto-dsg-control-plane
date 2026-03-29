import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

function getSafeNext(value: string | null) {
  if (!value || !value.startsWith('/')) return '/quickstart';
  return value;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const workspaceName = String(formData.get('workspace_name') || '').trim();
  const fullName = String(formData.get('full_name') || '').trim();
  const next = getSafeNext(String(formData.get('next') || ''));

  const redirectToSignup = new URL('/signup', request.url);
  redirectToSignup.searchParams.set('next', next);

  if (!email) {
    redirectToSignup.searchParams.set('error', 'missing-email');
    return NextResponse.redirect(redirectToSignup, { status: 302 });
  }

  if (!workspaceName) {
    redirectToSignup.searchParams.set('error', 'missing-workspace');
    return NextResponse.redirect(redirectToSignup, { status: 302 });
  }

  try {
    const supabase = await createClient();
    const admin = getSupabaseAdmin();

    const { data: existingProvisioned, error: existingProvisionedError } = await admin
      .from('users')
      .select('id, email, is_active, org_id, auth_user_id')
      .eq('email', email)
      .eq('is_active', true)
      .not('org_id', 'is', null)
      .maybeSingle();

    if (existingProvisionedError) {
      throw existingProvisionedError;
    }

    if (existingProvisioned) {
      redirectToSignup.searchParams.set('error', 'already-provisioned');
      return NextResponse.redirect(redirectToSignup, { status: 302 });
    }

    const { data: existingPending, error: existingPendingError } = await admin
      .from('trial_signups')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPendingError) {
      throw existingPendingError;
    }

    if (existingPending?.id) {
      const { error: updateIntentError } = await admin
        .from('trial_signups')
        .update({
          workspace_name: workspaceName,
          full_name: fullName || null,
        })
        .eq('id', existingPending.id);

      if (updateIntentError) {
        throw updateIntentError;
      }
    } else {
      const { error: insertIntentError } = await admin.from('trial_signups').insert({
        email,
        workspace_name: workspaceName,
        full_name: fullName || null,
        status: 'pending',
      });

      if (insertIntentError) {
        throw insertIntentError;
      }
    }

    const confirmUrl = new URL('/auth/confirm', request.nextUrl.origin);
    confirmUrl.searchParams.set('next', next);
    confirmUrl.searchParams.set('signup', 'trial');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: confirmUrl.toString(),
        shouldCreateUser: true,
      },
    });

    if (error) {
      redirectToSignup.searchParams.set('error', 'signup-failed');
      return NextResponse.redirect(redirectToSignup, { status: 302 });
    }

    redirectToSignup.searchParams.set('message', 'check-email');
    return NextResponse.redirect(redirectToSignup, { status: 302 });
  } catch (err) {
    console.error('[trial-signup] failed:', err);
    redirectToSignup.searchParams.set('error', 'signup-failed');
    return NextResponse.redirect(redirectToSignup, { status: 302 });
  }
}
