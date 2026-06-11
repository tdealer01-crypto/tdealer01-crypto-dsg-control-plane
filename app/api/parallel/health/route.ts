/**
 * PHASE 4: Parallel Queue Health Monitoring API
 * GET /api/parallel/health
 *
 * Returns comprehensive health metrics:
 * - Queue state: size, priority distribution, stale items, DLQ
 * - Executor capacity: deploy, vpc, browserbase with utilization
 * - Latency percentiles: p50, p95, p99
 * - Task retry tracking: active, near limit, exceeded
 * - Loop protection: max retries, blocked fingerprints, DLQ count
 * - Agent state (optional): current task, completion stats
 * - Overall health: ok flag + list of issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { requestQueue } from '@/lib/performance/request-queue';
import { executorThrottle } from '@/lib/performance/executor-throttle';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const queueStats = requestQueue.getStats();
    const dlqItems = requestQueue.getDeadLetterQueue();
    const taskAttempts = executorThrottle.getTaskAttemptStats();
    const blockedFingerprintsCount = executorThrottle.getBlockedFingerprintsCount();

    // Get all queue items (we need access to priority queues for detailed breakdown)
    // For now, we'll work with aggregated stats
    const capacityStatus = executorThrottle.getCapacityStatus();

    // Detect stale items - pending items older than 15 minutes (900000ms)
    const staleThresholdMs = 900000;
    const staleCount = queueStats.oldestRequestAgeMs > staleThresholdMs ? 1 : 0;

    // Count tasks by retry state
    let tasksNearLimit = 0;
    let tasksExceeded = 0;
    for (const attempt of taskAttempts.values()) {
      if (attempt.retryCount >= attempt.maxRetries - 1 && attempt.retryCount < attempt.maxRetries) {
        tasksNearLimit++;
      }
      if (attempt.retryCount >= attempt.maxRetries) {
        tasksExceeded++;
      }
    }

    // Detect issues
    const issues = detectIssues({
      queueSize: queueStats.size,
      staleCount,
      tasksExceeded,
      dlqCount: dlqItems.length,
      capacityStatus,
    });

    // Overall health: ok if queue is reasonable size and no critical issues
    const ok = queueStats.size < 5000 && staleCount === 0 && tasksExceeded < 10;

    return NextResponse.json({
      timestamp: new Date(),
      ok,
      queue: {
        total: queueStats.size,
        byPriority: queueStats.priorityDistribution,
        avgWaitMs: queueStats.avgWaitMs,
        p95WaitMs: queueStats.p95WaitMs,
        p99WaitMs: queueStats.p99WaitMs,
        stale: staleCount,
        dlq: dlqItems.length,
        oldestItemAgeMs: queueStats.oldestRequestAgeMs,
      },
      executors: {
        'virtual-pc': {
          used: capacityStatus['virtual-pc'].current,
          capacity: capacityStatus['virtual-pc'].max,
          utilization: capacityStatus['virtual-pc'].utilization,
        },
        browserbase: {
          used: capacityStatus.browserbase.current,
          capacity: capacityStatus.browserbase.max,
          utilization: capacityStatus.browserbase.utilization,
        },
        terminal: {
          used: capacityStatus.terminal.current,
          capacity: capacityStatus.terminal.max,
          utilization: capacityStatus.terminal.utilization,
        },
        deploy: {
          used: capacityStatus.deploy.current,
          capacity: capacityStatus.deploy.max,
          utilization: capacityStatus.deploy.utilization,
        },
      },
      tasks: {
        active: taskAttempts.size,
        nearLimit: tasksNearLimit,
        exceeded: tasksExceeded,
      },
      loopProtection: {
        maxRetries: 3,
        blockedFingerprints: blockedFingerprintsCount,
        tasksInDLQ: dlqItems.length,
      },
      health: {
        ok,
        issues,
      },
    });
  } catch (error) {
    console.error('Error in parallel health endpoint:', error);
    return NextResponse.json(
      {
        timestamp: new Date(),
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        health: {
          ok: false,
          issues: ['Health check failed'],
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PHASE 4: Detect health issues based on queue and task state
 */
function detectIssues(state: {
  queueSize: number;
  staleCount: number;
  tasksExceeded: number;
  dlqCount: number;
  capacityStatus: Record<string, { current: number; max: number; utilization: number }>;
}): string[] {
  const issues: string[] = [];

  if (state.queueSize > 5000) {
    issues.push('Queue size exceeds 5000 items');
  }

  if (state.queueSize > 1000 && state.queueSize > 500) {
    issues.push('High queue backlog - potential bottleneck');
  }

  if (state.staleCount > 0) {
    issues.push(`${state.staleCount} stale items (pending > 15 min)`);
  }

  if (state.tasksExceeded > 10) {
    issues.push(`${state.tasksExceeded} tasks exceeded retry limit`);
  }

  if (state.tasksExceeded > 0 && state.tasksExceeded <= 10) {
    issues.push(`${state.tasksExceeded} tasks at/exceeded retry limit`);
  }

  if (state.dlqCount > 100) {
    issues.push(`Dead letter queue size high (${state.dlqCount} items)`);
  }

  // Check executor utilization
  const highUtilization = Object.entries(state.capacityStatus).filter(
    ([_, status]) => status.utilization >= 0.9
  );
  if (highUtilization.length > 0) {
    issues.push(
      `${highUtilization.map(([name]) => name).join(', ')} at high utilization (>=90%)`
    );
  }

  return issues;
}
