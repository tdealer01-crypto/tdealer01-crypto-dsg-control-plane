import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return handleApiError('POST /api/auth/login', new Error('Email and password required'), {
        status: 400,
      });
    }

    // Authentication is a production trust boundary. Missing configuration must
    // never produce a synthetic identity or token; fail closed instead.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[auth/login] Supabase authentication is not configured');
      return NextResponse.json(
        { error: 'authentication_service_unavailable' },
        { status: 503 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return handleApiError('POST /api/auth/login', error, {
        status: 401,
      });
    }

    if (!data.session) {
      return handleApiError('POST /api/auth/login', new Error('No session created'), {
        status: 401,
      });
    }

    return NextResponse.json({
      token: data.session.access_token,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        user_metadata: data.user?.user_metadata,
      },
    });
  } catch (error) {
    return handleApiError('POST /api/auth/login', error);
  }
}
