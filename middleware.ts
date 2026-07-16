import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getSafeNext } from './lib/auth/safe-next';

function isProtectedPath(pathname: string) {
  if (pathname === '/dashboard/trinity') {
    return false;
  }
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
  // ── Correlation ID ─────────────────────────────────────────────────────────
  // Propagate or generate a unique request ID for every request.
  // Downstream services receive it via X-Request-ID header.
  // Clients can correlate logs, errors, and traces with a single ID.
  const requestId =
    request.headers.get('x-request-id') ??
    request.headers.get('x-correlation-id') ??
    crypto.randomUUID();

  const requestStart = Date.now();

  // Clone the request with the correlation ID injected, stripping auth-related headers
  // to prevent header spoofing. These headers are only set after JWT verification.
  const safeHeaders = new Headers(request.headers);
  safeHeaders.delete('x-user-id');
  safeHeaders.delete('x-user-email');

  const requestWithId = new NextRequest(request.url, {
    method: request.method,
    headers: safeHeaders,
    body: request.body,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
  requestWithId.headers.set('x-request-id', requestId);

  // Allow public access to pricing page
  if (request.nextUrl.pathname === '/pricing') {
    return stamp(NextResponse.next({ request: requestWithId }));
  }

  let response = NextResponse.next({ request: requestWithId });

  // Helper: stamp correlation + timing headers on any response
  function stamp(res: NextResponse): NextResponse {
    res.headers.set('x-request-id', requestId);
    res.headers.set('x-response-time', `${Date.now() - requestStart}ms`);
    return res;
  }

  // ── API routes: body-size enforcement + JWT Bearer token support ──────────
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const cl = request.headers.get('content-length');
      if (cl && parseInt(cl, 10) > API_BODY_SIZE_LIMIT) {
        return stamp(
          NextResponse.json({ error: 'Request body too large' }, { status: 413 }),
        );
      }
    }

    // Extract and validate JWT Bearer token if present
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      if (url && anonKey) {
        try {
          const supabase = createServerClient(url, anonKey, {
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

          // Verify token with Supabase
          const { data, error } = await supabase.auth.getUser(token);
          if (data?.user && !error) {
            // Token is valid - add verified user to request headers
            const authHeaders = new Headers(request.headers);
            authHeaders.delete('x-user-id');
            authHeaders.delete('x-user-email');

            const requestWithAuth = new NextRequest(request.url, {
              method: request.method,
              headers: authHeaders,
              body: request.body,
              duplex: 'half',
            } as RequestInit & { duplex: 'half' });

            requestWithAuth.headers.set('x-user-id', data.user.id);
            requestWithAuth.headers.set('x-user-email', data.user.email || '');
            requestWithAuth.headers.set('x-request-id', requestId);

            const authResponse = NextResponse.next({ request: requestWithAuth });
            return stamp(authResponse);
          }
        } catch (err) {
          // Invalid token - continue to route handler which will reject if needed
        }
      }
    }

    return stamp(response);
  }

  // ── Page routes: Supabase auth ─────────────────────────────────────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Localhost/dev bypass: skip auth for local inspection UI
  const host = request.headers.get('host') || '';
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  if (isLocalhost) {
    return stamp(response);
  }

  if (!url || !key) {
    if (isProtectedPath(request.nextUrl.pathname)) {
      if (request.nextUrl.pathname === '/app-shell') {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', '/app-shell');
        return stamp(NextResponse.redirect(loginUrl));
      }
      return stamp(
        new NextResponse('Service unavailable — authentication not configured', {
          status: 503,
        }),
      );
    }
    return stamp(response);
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
    return stamp(NextResponse.redirect(new URL(next, request.url)));
  }

  if (isProtectedPath(request.nextUrl.pathname) && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set(
      'next',
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return stamp(NextResponse.redirect(loginUrl));
  }

  return stamp(response);
}

export const config = {
  matcher: [
    // Page routes: Supabase session + protected-path auth
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // API routes: body-size enforcement + correlation ID
    '/api/:path*',
  ],
};