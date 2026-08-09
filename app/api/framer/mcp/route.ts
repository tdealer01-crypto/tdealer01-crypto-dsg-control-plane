import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { NextResponse as NextResponseImpl } from 'next/server';
import { GET as mcpGet, POST as mcpPost } from '@/app/api/mcp/route';
import { buildCorsHeaders, buildPreflightResponse, resolveAllowedOrigin } from '@/lib/security/cors';

export const dynamic = 'force-dynamic';

function withCors(request: NextRequest, response: NextResponse): NextResponse {
  const corsHeaders = buildCorsHeaders(request);
  corsHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

function checkOriginAllowed(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;

  if (!resolveAllowedOrigin(request)) {
    return NextResponseImpl.json(
      { error: 'Origin not allowed' },
      { status: 403, headers: { Vary: 'Origin' } }
    );
  }
  return null;
}

export async function OPTIONS(request: NextRequest) {
  return buildPreflightResponse(request);
}

export async function GET(request: NextRequest) {
  const originCheck = checkOriginAllowed(request);
  if (originCheck) return originCheck;
  return withCors(request, await mcpGet());
}

export async function POST(request: NextRequest) {
  const originCheck = checkOriginAllowed(request);
  if (originCheck) return originCheck;
  return withCors(request, await mcpPost(request));
}
