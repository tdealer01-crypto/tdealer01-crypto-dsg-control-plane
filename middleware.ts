import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getSafeNext } from './lib/auth/safe-next';

function isProtectedPath(pathname: string) {
  return (
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname === '/app-shell' ||
    pathname === '/approvals' ||
    pathname.startsWith('/approvals/') ||
    pathname === '/gateway/monitor' ||
    pathname.startsWith('/gateway/monitor/')
  );
}

const API_BODY_SIZE_LIMIT = 1_048_576; // 1 MB

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Enforce body size limit for API routes; skip full auth pipeline for API paths
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const cl = request.headers.get('content-length');
      if (cl && parseInt(cl, 10) > API_BODY_SIZE_LIMIT) {
        return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
      }
    }
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    if (isProtectedPath(request.nextUrl.pathname)) {
      if (request.nextUrl.pathname === '/app-shell') {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', '/app-shell');
        return NextResponse.redirect(loginUrl);
      }
      return new NextResponse(
        'Service unavailable — authentication not configured',
        { status: 503 }
      );
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (request.nextUrl.pathname === '/login' && user) {
    const next = getSafeNext(request.nextUrl.searchParams.get('next'));
    return NextResponse.redirect(new URL(next, request.url));
  }

  if (isProtectedPath(request.nextUrl.pathname) && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set(
      'next',
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    );
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Page routes: Supabase session + protected-path auth
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // API routes: body-size enforcement only
    '/api/:path*',
  ],
};
