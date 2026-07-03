import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      ok: false,
      message: 'WebSocket not directly supported in Next.js route handlers',
      alternatives: {
        sse: '/api/trinity/stream (recommended for Next.js)',
        deployment: 'Use a separate WebSocket server for production deployments',
        example: 'ws.anthropic.com for Anthropic Managed Agents',
      },
      note: 'WebSocket upgrade requires a custom server or cloud worker',
    },
    { status: 501 }
  );
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
