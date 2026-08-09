import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { GET as mcpGet, POST as mcpPost } from '@/app/api/mcp/route';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';

export const dynamic = 'force-dynamic';

function withCors(request: NextRequest, response: NextResponse): NextResponse {
  const corsHeaders = buildCorsHeaders(request);
  corsHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function OPTIONS(request: NextRequest) {
  return buildPreflightResponse(request);
}

export async function GET(request: NextRequest) {
  return withCors(request, await mcpGet());
}

export async function POST(request: NextRequest) {
  return withCors(request, await mcpPost(request));
}
