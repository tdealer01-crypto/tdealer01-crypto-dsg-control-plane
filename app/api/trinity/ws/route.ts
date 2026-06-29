import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // WebSocket upgrade handling
  // Note: Next.js doesn't natively support WebSocket upgrades in route handlers
  // This is a placeholder for WebSocket support that would need:
  // 1. A dedicated WebSocket server (e.g., via Vercel Edge Functions or separate service)
  // 2. Or using Next.js with a custom server setup
  // For now, returning a helpful message

  return new Response(
    JSON.stringify({
      ok: false,
      message: 'WebSocket endpoint - connect via browser WebSocket API',
      endpoint: '/api/trinity/ws',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
