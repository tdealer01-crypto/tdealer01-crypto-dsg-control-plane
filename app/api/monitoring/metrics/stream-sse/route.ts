/**
 * Server-Sent Events: GET /api/monitoring/metrics/stream-sse
 * Real-time metrics updates via SSE
 *
 * Aggregates metrics and sends updates every 10 seconds
 *
 * Usage:
 * const eventSource = new EventSource('/api/monitoring/metrics/stream-sse?period=month');
 * eventSource.onmessage = (event) => {
 *   const metrics = JSON.parse(event.data);
 * };
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const UPDATE_INTERVAL = 10000; // 10 seconds (aggregate metrics)
const MESSAGE_TIMEOUT = 120000; // 2 minutes

interface MetricsUpdate {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  totalTokens: number;
  totalCost: number;
  avgDuration: number;
  timestamp: string;
}

function getPeriodDays(period: string): number {
  switch (period) {
    case 'day':
      return 1;
    case 'week':
      return 7;
    case 'month':
      return 30;
    default:
      return 30;
  }
}

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agent_id');
  const period = request.nextUrl.searchParams.get('period') || 'month';
  const userId = request.nextUrl.searchParams.get('user_id');

  try {
    const supabase = await createClient();

    // Verify access
    if (userId && agentId) {
      const { data: access } = await supabase
        .from('agent_profiles')
        .select('agent_id')
        .eq('agent_id', agentId)
        .eq('created_by', userId)
        .single();

      if (!access) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const periodDays = getPeriodDays(period);
    let isClosed = false;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Send heartbeat
        const heartbeat = () => {
          if (!isClosed) {
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          }
        };

        const heartbeatInterval = setInterval(heartbeat, HEARTBEAT_INTERVAL);

        // Calculate and send metrics every 10 seconds
        const updateInterval = setInterval(async () => {
          if (isClosed) return;

          try {
            const now = new Date();
            const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

            // Build query
            let query = supabase
              .from('monitoring_executions')
              .select('status, total_tokens, total_cost_usd, start_time, end_time')
              .gte('created_at', startDate.toISOString());

            if (agentId) {
              query = query.eq('agent_id', agentId);
            }

            const { data: executions, error } = await query;

            if (error) {
              console.error('Failed to fetch metrics:', error);
              return;
            }

            // Calculate metrics
            const total = executions?.length || 0;
            const successful = executions?.filter((e) => e.status === 'success').length || 0;
            const failed = executions?.filter((e) => e.status === 'failure').length || 0;
            const successRate = total > 0 ? (successful / total) * 100 : 0;
            const totalTokens = executions?.reduce((sum, e) => sum + (e.total_tokens || 0), 0) || 0;
            const totalCost = executions?.reduce((sum, e) => sum + (e.total_cost_usd || 0), 0) || 0;

            let avgDuration = 0;
            if (total > 0) {
              const durations = executions
                ?.filter((e) => e.start_time && e.end_time)
                .map((e) => (new Date(e.end_time!).getTime() - new Date(e.start_time!).getTime()) / 1000) || [];
              avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
            }

            const metrics: MetricsUpdate = {
              totalExecutions: total,
              successfulExecutions: successful,
              failedExecutions: failed,
              successRate: parseFloat(successRate.toFixed(2)),
              totalTokens,
              totalCost: parseFloat(totalCost.toFixed(4)),
              avgDuration: parseFloat(avgDuration.toFixed(2)),
              timestamp: new Date().toISOString(),
            };

            const message = `data: ${JSON.stringify(metrics)}\n\n`;
            controller.enqueue(encoder.encode(message));
          } catch (error) {
            console.error('Error calculating metrics:', error);
          }
        }, UPDATE_INTERVAL);

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          isClosed = true;
          clearInterval(heartbeatInterval);
          clearInterval(updateInterval);
          controller.close();
        });

        // Auto-close after 2 minutes
        setTimeout(() => {
          isClosed = true;
          clearInterval(heartbeatInterval);
          clearInterval(updateInterval);
          controller.close();
        }, MESSAGE_TIMEOUT);
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
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
