import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { createClient } from '../../../lib/supabase/server';

function getSafeNext(value: string | null) {
  if (!value || !value.startsWith('/')) return '/dashboard/executions';
  return value;
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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

  let createdOrgId: string | null = null;
  let touchedUserId: string | null = null;

  try {
    const admin = getSupabaseAdmin();

    const { data: existingUser, error: existingUserErr } = await admin
      .from('users')
      .select('id, org_id, is_active')
      .eq('email', email)
      .maybeSingle();

    if (existingUserErr) {
      throw existingUserErr;
    }

    if (existingUser?.org_id && existingUser.is_active) {
      redirectToSignup.searchParams.set('error', 'already-provisioned');
      return NextResponse.redirect(redirectToSignup, { status: 302 });
    }

    const baseSlug = toSlug(workspaceName) || 'workspace';
    const slug = `${baseSlug}-${randomUUID().slice(0, 8)}`;
    const orgId = `org_${randomUUID().replace(/-/g, '').slice(0, 24)}`;

    const { error: orgErr } = await admin.from('organizations').insert({
      id: orgId,
      name: workspaceName,
      slug,
      plan: 'trial',
      status: 'active',
    });

    if (orgErr) {
      throw orgErr;
    }

    createdOrgId = orgId;

    if (existingUser?.id) {
      touchedUserId = existingUser.id;

      const { error: updateUserErr } = await admin
        .from('users')
        .update({ org_id: orgId, is_active: true, role: 'owner' })
        .eq('id', existingUser.id);

      if (updateUserErr) {
        throw updateUserErr;
      }
    } else {
      const { data: insertedUser, error: insertUserErr } = await admin
        .from('users')
        .insert({
          email,
          org_id: orgId,
          role: 'owner',
          is_active: true,
        })
        .select('id')
        .single();

      if (insertUserErr) {
        throw insertUserErr;
      }

      touchedUserId = insertedUser.id;
    }

    const supabase = await createClient();
    const confirmUrl = new URL('/auth/confirm', request.nextUrl.origin);
    confirmUrl.searchParams.set('next', next);

    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: confirmUrl.toString(),
        shouldCreateUser: true,
        data: {
          full_name: fullName || undefined,
          workspace_name: workspaceName,
        },
      },
    });

    if (otpErr) {
      throw otpErr;
    }

    redirectToSignup.searchParams.set('message', 'check-email');
    return NextResponse.redirect(redirectToSignup, { status: 302 });
  } catch (err) {
    console.log('[signup] failed:', err);
    const admin = getSupabaseAdmin();

    if (touchedUserId && createdOrgId) {
      await admin
        .from('users')
        .update({ org_id: null, is_active: false })
        .eq('id', touchedUserId)
        .eq('org_id', createdOrgId);
    }

    if (createdOrgId) {
      await admin.from('organizations').delete().eq('id', createdOrgId);
    }

    if (typeof err === 'object' && err !== null && 'code' in err) {
      const code = String((err as { code?: string }).code || '');
      if (code === '23505') {
        redirectToSignup.searchParams.set('error', 'already-provisioned');
        return NextResponse.redirect(redirectToSignup, { status: 302 });
      }
    }

    redirectToSignup.searchParams.set('error', 'signup-failed');
    return NextResponse.redirect(redirectToSignup, { status: 302 });
  }
}
