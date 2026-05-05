import { NextResponse, type NextRequest } from 'next/server';

const AUTH_COOKIE_NAMES = [
  'sb-access-token',
  'sb-refresh-token',
  '__session',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  const hasAuthCookie = AUTH_COOKIE_NAMES.some((name) => Boolean(request.cookies.get(name)?.value));

  if (!hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
