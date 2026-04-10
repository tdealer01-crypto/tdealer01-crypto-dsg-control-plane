import { NextResponse } from 'next/server';

const ALLOW_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const ALLOW_HEADERS =
  'Authorization,Content-Type,X-Requested-With,Idempotency-Key';

function parseOrigin(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const parsed = new URL(String(value).trim());
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.origin;
    }
  } catch {}

  return null;
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

export function getAllowedCorsOrigins(): string[] {
  const explicit = String(process.env.DSG_ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => parseOrigin(item))
    .filter(Boolean) as string[];

  const appOrigin = parseOrigin(
    process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
  );

  const vercelOrigin = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? parseOrigin(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    : null;

  return unique([...explicit, appOrigin, vercelOrigin]);
}

export function resolveAllowedOrigin(request: Request): string | null {
  const requestOrigin = parseOrigin(request.headers.get('origin'));
  if (!requestOrigin) return null;

  const allowed = getAllowedCorsOrigins();
  return allowed.includes(requestOrigin) ? requestOrigin : null;
}

export function buildCorsHeaders(
  request: Request,
  extraHeaders?: HeadersInit
): Headers {
  const headers = new Headers(extraHeaders);
  const allowedOrigin = resolveAllowedOrigin(request);

  if (!allowedOrigin) {
    return headers;
  }

  headers.set('Access-Control-Allow-Origin', allowedOrigin);
  headers.set('Access-Control-Allow-Methods', ALLOW_METHODS);
  headers.set('Access-Control-Allow-Headers', ALLOW_HEADERS);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Max-Age', '600');

  const vary = headers.get('Vary');
  headers.set('Vary', vary ? `${vary}, Origin` : 'Origin');

  return headers;
}

export function buildPreflightResponse(request: Request): NextResponse {
  const requestOrigin = parseOrigin(request.headers.get('origin'));

  if (!requestOrigin) {
    return new NextResponse(null, { status: 204 });
  }

  const allowedOrigin = resolveAllowedOrigin(request);
  if (!allowedOrigin) {
    return NextResponse.json(
      { error: 'Origin not allowed' },
      {
        status: 403,
        headers: {
          Vary: 'Origin',
        },
      }
    );
  }

  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}
