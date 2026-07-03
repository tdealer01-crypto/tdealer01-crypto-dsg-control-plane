import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL('/api/trinity/discover', request.url);
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: request.headers,
    cache: 'no-store',
  });

  const body = await response.json();
  return NextResponse.json(body, { status: response.status });
}
