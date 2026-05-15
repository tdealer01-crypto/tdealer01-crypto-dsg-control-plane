import { NextResponse, type NextRequest } from 'next/server';

function isJwtStructurallyValid(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return false;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

const PROTECTED_PREFIXES = ['/dsg', '/enterprise', '/generated-apps'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // Supabase access token cookie (may be prefixed with project ref)
  const accessToken =
    // Try common Supabase cookie patterns
    [...request.cookies.getAll()].find(
      (c) =>
        c.name.endsWith('-auth-token') ||
        c.name === 'sb-access-token' ||
        c.name.includes('auth-token')
    )?.value;

  if (accessToken && isJwtStructurallyValid(accessToken)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/dsg/:path*', '/enterprise/:path*', '/generated-apps/:path*'],
};
