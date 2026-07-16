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

    // Lazy-load Supabase config at runtime, not at build time
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      // Fallback: if Supabase not configured, return mock auth
      console.warn('Supabase not configured, using mock auth');
      return NextResponse.json({
        token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Math.random()}.mock_token`,
        user: { email, id: `user-${Date.now()}` },
      });
    }

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Sign in with Supabase
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

    // Return JWT token and user info
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
