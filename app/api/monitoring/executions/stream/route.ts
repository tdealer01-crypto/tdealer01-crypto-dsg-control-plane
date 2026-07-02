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

export const dynamic = 'force-dynamic';

interface ExecutionUpdate {
  execution_id: string;
  agent_id: string;
  status: 'running' | 'success' | 'failure' | 'blocked';
  total_tokens: number;
  total_cost_usd: number;
  start_time: string;
  end_time?: string;
  timestamp: string;
}

// In-memory client registry (in production, use Redis)
const clients = new Map<string, Set<WebSocket>>();

/**
 * Broadcast execution update to all subscribed clients
 */
export function broadcastExecutionUpdate(update: ExecutionUpdate) {
  const agentClients = clients.get(update.agent_id);
  if (!agentClients) return;

  const message = JSON.stringify(update);
  agentClients.forEach((ws) => {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    } catch (error) {
      console.error('Failed to send execution update:', error);
    }
  });
}

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

export { broadcastExecutionUpdate };
