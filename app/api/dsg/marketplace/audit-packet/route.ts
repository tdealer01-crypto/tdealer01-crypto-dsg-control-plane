import { NextResponse } from 'next/server';
import { createDsgAuditPacket } from '@/lib/dsg/marketplace/audit-packet';

export const dynamic = 'force-dynamic';

function resolveCanonicalBase(reqUrl: URL): string {
  if (!process.env.APP_URL) return reqUrl.origin;
  return new URL(process.env.APP_URL).origin;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  let canonicalBase: string;

  try {
    canonicalBase = resolveCanonicalBase(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'APP_URL is not a valid URL.';
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'INVALID_APP_URL_CONFIG', message },
        nextAction: 'Set APP_URL to a valid absolute URL or unset APP_URL so the audit packet can use the request origin.',
      },
      { status: 500 },
    );
  }

  const requestedBaseUrl = url.searchParams.get('baseUrl');

  if (requestedBaseUrl) {
    let requestedOrigin: string;
    try {
      requestedOrigin = new URL(requestedBaseUrl).origin;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'INVALID_BASE_URL';
      return NextResponse.json(
        {
          ok: false,
          error: { code: 'INVALID_BASE_URL', message },
          nextAction: 'Remove the baseUrl query parameter or set it to the canonical APP_URL origin.',
        },
        { status: 400 },
      );
    }

    if (requestedOrigin !== canonicalBase) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: 'BASE_URL_MISMATCH', message: 'baseUrl query parameter does not match the canonical base URL.' },
          canonicalBase,
          requestedBaseUrl: requestedOrigin,
          nextAction: 'Use the canonical APP_URL/request origin for audit packets; arbitrary baseUrl overrides are blocked.',
        },
        { status: 400 },
      );
    }
  }

  return NextResponse.json(createDsgAuditPacket(canonicalBase));
}
