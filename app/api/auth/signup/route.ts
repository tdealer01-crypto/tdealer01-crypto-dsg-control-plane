import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { handleApiError } from '../../../../lib/security/api-error';
import { captureEvent } from '../../../../lib/telemetry/capture-event';

export const dynamic = 'force-dynamic';

interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
  workspace_name: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SignupRequest = await request.json();
    const { email, password, full_name, workspace_name } = body;

    // Validation
    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'email is required' },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (!full_name?.trim()) {
      return NextResponse.json(
        { error: 'full_name is required' },
        { status: 400 }
      );
    }

    if (!workspace_name?.trim()) {
      return NextResponse.json(
        { error: 'workspace_name is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const admin = getSupabaseAdmin();
    const { data: existingUser } = await (admin.auth.admin.listUsers() as any);

    if (existingUser?.users?.some((u: any) => u.email === normalizedEmail)) {
      return NextResponse.json(
        { error: 'email-taken', code: 'email-taken' },
        { status: 409 }
      );
    }

    // Create Supabase auth user
    const { data, error } = await (admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: full_name.trim(),
        workspace_name: workspace_name.trim(),
      },
    }) as any);

    if (error) {
      console.error('[api-auth-signup] create user failed:', error);
      if (error.message?.includes('duplicate')) {
        return NextResponse.json(
          { error: 'email-taken', code: 'email-taken' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    const userId = data.user?.id;

    // Capture user_signup event (fire and forget)
    if (userId) {
      const emailDomain = normalizedEmail.split('@')[1];
      void captureEvent('user_signup', {
        userId,
        organizationId: '', // org doesn't exist yet, will be set during bootstrap
      }, {
        signup_method: 'password',
        email_domain: emailDomain,
        full_name: full_name.trim(),
        timestamp: new Date().toISOString(),
      }).catch((err) => {
        console.error('[api-auth-signup] Failed to capture user_signup event:', err);
      });
    }

    return NextResponse.json({
      success: true,
      user_id: userId,
      email: normalizedEmail,
      message: 'Account created successfully. You can now log in.',
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create account');
  }
}
