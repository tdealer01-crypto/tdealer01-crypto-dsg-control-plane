/**
 * POST /api/phase4b/create-test-user
 *
 * Phase 4B telemetry validation endpoint.
 * Creates a test user with pre-confirmed email to bypass Supabase OTP requirement.
 * Requires PHASE_4B_TEST_KEY header for authorization.
 *
 * Usage:
 * curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/phase4b/create-test-user \
 *   -H "x-phase4b-key: <PHASE_4B_TEST_KEY>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"email": "test@example.com", "full_name": "Test User"}'
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleApiError, internalErrorMessage } from '../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Validate authorization header
    const provided = request.headers.get('x-phase4b-key');
    const expected = process.env.PHASE_4B_TEST_KEY;

    if (!expected || !provided || provided !== expected) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized - invalid or missing PHASE_4B_TEST_KEY' },
        { status: 403 }
      );
    }

    // Check required Supabase environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const fullName = String(body.full_name || 'Phase 4B Test User').trim();
    const password = 'Phase4BTest!' + Date.now();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { ok: false, error: 'Valid email required' },
        { status: 400 }
      );
    }

    // Create Supabase admin client
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create auth user with pre-confirmed email
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authError || !authData?.user) {
      console.error('[phase4b] Auth user creation failed:', authError);
      return NextResponse.json(
        {
          ok: false,
          error: 'Failed to create user',
          details: internalErrorMessage(),
        },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Create database record
    const { data: dbData, error: dbError } = await admin
      .from('users')
      .insert({
        id: userId,
        email,
        full_name: fullName,
        is_active: true,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[phase4b] Database insert failed:', dbError);
      return NextResponse.json(
        {
          ok: false,
          error: 'Failed to create user record',
          details: internalErrorMessage(),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: userId,
        email,
        full_name: fullName,
      },
      next_steps: [
        'Visit https://tdealer01-crypto-dsg-control-plane.vercel.app/auth/login',
        `Sign in with: ${email}`,
        `Password: ${password}`,
        'User will trigger organization_created and workspace_created events',
      ],
    });
  } catch (error) {
    return handleApiError('api/phase4b/create-test-user', error);
  }
}
