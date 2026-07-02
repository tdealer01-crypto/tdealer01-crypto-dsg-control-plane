/**
 * WebSocket: GET /api/monitoring/executions/stream
 * Real-time execution updates via WebSocket
 *
 * Usage:
 * const ws = new WebSocket('wss://example.com/api/monitoring/executions/stream?agent_id=agent_123');
 * ws.onmessage = (event) => {
 *   const execution = JSON.parse(event.data);
 *   // { execution_id, agent_id, status, total_tokens, total_cost_usd, timestamp }
 * };
 */

import { NextRequest, NextResponse } from 'next/server';
import { broadcastExecutionUpdate } from '@/lib/monitoring/broadcast-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Note: Next.js 15 does not have native WebSocket support in route handlers
  // This is a placeholder showing the intended API
  // In production, use a dedicated WebSocket server (Socket.io, ws library, etc.)

  const agentId = request.nextUrl.searchParams.get('agent_id');

  if (!agentId) {
    return NextResponse.json(
      { error: 'agent_id query parameter required' },
      { status: 400 }
    );
  }

  // Return placeholder response
  // Real implementation requires Node.js WebSocket server
  return NextResponse.json(
    {
      ok: false,
      error: 'WebSocket upgrade required',
      info: 'Use Server-Sent Events as fallback: /api/monitoring/executions/stream-sse',
      upgradeUrl: `wss://example.com/api/monitoring/executions/stream?agent_id=${agentId}`,
    },
    { status: 426 }
  );
}
