/**
 * Server-Sent Events: GET /api/monitoring/executions/stream-sse
 * Real-time execution updates via SSE (HTTP long-polling fallback)
 *
 * Usage:
 * const eventSource = new EventSource('/api/monitoring/executions/stream-sse?agent_id=agent_123');
 * eventSource.onmessage = (event) => {
 *   const execution = JSON.parse(event.data);
 * };
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const MESSAGE_TIMEOUT = 120000; // 2 minutes

interface ExecutionUpdate {
  execution_id: string;
  agent_id: string;
  status: string;
  total_tokens: number;
  total_cost_usd: number;
  start_time: string;
  end_time?: string;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agent_id');
  const userId = request.nextUrl.searchParams.get('user_id');

  if (!agentId) {
    return NextResponse.json(
      { error: 'agent_id query parameter required' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    // Note: Access control should be implemented at org/agent level
    // For now, agent_id filtering provides basic isolation

    // Setup SSE response
    const encoder = new TextEncoder();
    let isClosed = false;

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection message
        const heartbeat = () => {
          if (!isClosed) {
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          }
        };

        // Send heartbeat every 30 seconds
        const heartbeatInterval = setInterval(heartbeat, HEARTBEAT_INTERVAL);

        // Poll for new executions every 5 seconds
        const pollInterval = setInterval(async () => {
          if (isClosed) return;

          try {
            const now = new Date();
            const fiveSecondsAgo = new Date(now.getTime() - 5000);

            const { data: executions, error } = await supabase
              .from('monitoring_executions')
              .select('*')
              .eq('agent_id', agentId)
              .gte('updated_at', fiveSecondsAgo.toISOString())
              .order('updated_at', { ascending: false })
              .limit(10);

            if (error) {
              console.error('Failed to fetch executions:', error);
              return;
            }

            // Send each execution update
            executions?.forEach((execution) => {
              const update: ExecutionUpdate = {
                execution_id: execution.execution_id,
                agent_id: execution.agent_id,
                status: execution.status,
                total_tokens: execution.total_tokens || 0,
                total_cost_usd: execution.total_cost_usd || 0,
                start_time: execution.start_time,
                end_time: execution.end_time,
                timestamp: new Date().toISOString(),
              };

              const message = `data: ${JSON.stringify(update)}\n\n`;
              controller.enqueue(encoder.encode(message));
            });
          } catch (error) {
            console.error('Error polling executions:', error);
          }
        }, 5000);

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          isClosed = true;
          clearInterval(heartbeatInterval);
          clearInterval(pollInterval);
          controller.close();
        });

        // Auto-close after 2 minutes (client should reconnect)
        setTimeout(() => {
          isClosed = true;
          clearInterval(heartbeatInterval);
          clearInterval(pollInterval);
          controller.close();
        }, MESSAGE_TIMEOUT);
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering for SSE
      },
    });
  } catch (error) {
    console.error('SSE stream error:', error);
    return NextResponse.json(
      { error: 'Failed to establish stream' },
      { status: 500 }
    );
  }
}
