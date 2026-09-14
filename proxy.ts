// Proxy: request routing and session validation
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

function isRetiredTrinityPath(pathname: string) {
  return (
    pathname === '/api/trinity' ||
    pathname.startsWith('/api/trinity/') ||
    pathname === '/api/dashboard/trinity' ||
    pathname.startsWith('/api/dashboard/trinity/') ||
    pathname === '/dashboard/trinity' ||
    pathname.startsWith('/dashboard/trinity/')
  );
}

const UNTRUSTED_TRINITY_HEADERS = [
  'x-trinity-role',
  'x-trinity-org-id',
  'x-trinity-actor-id',
  'x-trinity-wallet-address',
] as const;

function sanitizeForwardedHeaders(source: Headers) {
  const headers = new Headers(source);
  headers.delete('x-user-id');
  headers.delete('x-user-email');
  for (const name of UNTRUSTED_TRINITY_HEADERS) headers.delete(name);
  return headers;
}

const API_BODY_SIZE_LIMIT = 1_048_576; // 1 MB

export async function proxy(request: NextRequest) {
  const requestId =
    request.headers.get('x-request-id') ??
    request.headers.get('x-correlation-id') ??
    crypto.randomUUID();
  const requestStart = Date.now();

  function stamp(res: NextResponse): NextResponse {
    res.headers.set('x-request-id', requestId);
    res.headers.set('x-response-time', `${Date.now() - requestStart}ms`);
    return res;
  }

  // Legacy Trinity is retired. Block it before authentication, routing, DB access,
  // or any route-handler logic. 410 makes the retirement explicit and fail-closed.
  if (isRetiredTrinityPath(request.nextUrl.pathname)) {
    return stamp(
      NextResponse.json(
        {
          ok: false,
          code: 'TRINITY_LEGACY_DISABLED',
          error: 'Legacy Trinity surface is retired and disabled',
        },
        {
          status: 410,
          headers: { 'cache-control': 'no-store' },
        },
      ),
    );
  }

  // Clone the request with the correlation ID injected, stripping identity headers
  // that must never be trusted when supplied by an external caller.
  const safeHeaders = sanitizeForwardedHeaders(request.headers);

  const requestWithId = new NextRequest(request.url, {
    method: request.method,
    headers: safeHeaders,
    body: request.body,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
  requestWithId.headers.set('x-request-id', requestId);

  if (request.nextUrl.pathname === '/pricing') {
    return stamp(NextResponse.next({ request: requestWithId }));
  }

  let response = NextResponse.next({ request: requestWithId });

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

          const { data, error } = await supabase.auth.getUser(token);
          if (data?.user && !error) {
            const authHeaders = sanitizeForwardedHeaders(request.headers);

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
        } catch {
          // Invalid token - continue to route handler which will reject if needed.
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
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/api/:path*',
  ],
};// Vercel production rebuild trigger - 1784958177
// Force production live - 1784959274
