import { NextResponse } from 'next/server';
import { requestQueue } from '@/lib/performance/request-queue';
import { harmonyEngine } from '@/lib/parallel/harmony-engine';
import { executorThrottle } from '@/lib/performance/executor-throttle';
import { getSimulationStats } from '@/lib/parallel/parallel-simulation-orchestrator';

/**
 * GET /api/parallel/queue/status
 *
 * Returns the metrics actually held by the Phase 2 parallel-control-plane
 * components in the process serving this request. On serverless deployments
 * these values are per-instance, not a fabricated global aggregate.
 */
export async function GET() {
  try {
    const simulationStats = getSimulationStats();

    return NextResponse.json(
      {
        queue: requestQueue.getStats(),
        harmonyEngine: harmonyEngine.getStats(),
        executorCapacity: executorThrottle.getCapacityStatus(),
        activeEnvironments: simulationStats.activeEnvironments,
        totalAgents: simulationStats.totalAgents,
        cacheMetrics: simulationStats.cacheMetrics,
        scope: 'current_process',
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[Parallel Queue Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch parallel metrics' },
      { status: 500 }
    );
  }
}
