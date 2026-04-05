import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { getSafeNext } from '../../../lib/auth/safe-next';
import { validateAuthConfig } from '../../../lib/auth/preflight';

function getTrustedAppOrigin() {
  const configuredAppUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (!configuredAppUrl) {
    throw new Error('APP_URL or NEXT_PUBLIC_APP_URL is required');
  }

  const parsed = new URL(configuredAppUrl);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('APP_URL or NEXT_PUBLIC_APP_URL must use http/https');
  }

  return parsed.origin;
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

  const preflight = validateAuthConfig({ requireAppUrl: true });
  if (preflight.warnings.length) {
    console.warn('[trial-signup] preflight warnings:', preflight.warnings);
  }

  if (!preflight.ok) {
    const firstError = preflight.errors[0];
    console.error('[trial-signup] preflight failed:', preflight.errors);
    redirectToSignup.searchParams.set('error', firstError ? firstError.code : 'signup-failed');
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

    const confirmUrl = new URL('/auth/confirm', getTrustedAppOrigin());
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
