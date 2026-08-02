/**
 * Parallel Control Plane Metrics Collection
 *
 * Collects real-time metrics from:
 * - Request queue (size, wait times, priority distribution)
 * - Harmony cache (hit rates, latency, embedding vs heuristic)
 * - Executor throttle (utilization, capacity)
 * - Audit batch writer (batch latency, chain status)
 *
 * Aggregates into 1-minute buckets for dashboarding
 */

export interface QueueMetrics {
  size: number;
  avgWaitMs: number;
  p50WaitMs: number;
  p95WaitMs: number;
  p99WaitMs: number;
  priorityDistribution: {
    p1: number;
    p2: number;
    p3: number;
  };
}

export interface CacheMetrics {
  heuristicHitRate: number; // 0-100%
  embeddingHitRate: number; // 0-100%
  totalHitRate: number; // 0-100%
  missCount: number;
  avgLatencyMs: number;
  indexSize: {
    heuristic: number;
    embedding: number;
  };
}

export interface ExecutorMetrics {
  'virtual-pc': {
    utilizationPercent: number;
    currentCount: number;
    maxConcurrent: number;
  };
  browserbase: {
    utilizationPercent: number;
    currentCount: number;
    maxConcurrent: number;
  };
  terminal: {
    utilizationPercent: number;
    currentCount: number;
    maxConcurrent: number;
  };
  deploy: {
    utilizationPercent: number;
    currentCount: number;
    maxConcurrent: number;
  };
}

export interface AuditMetrics {
  batchLatencyMs: number;
  eventsInBuffer: number;
  batchesWritten: number;
  chainStatus: 'valid' | 'broken' | 'unknown';
}

export interface ParallelMetrics {
  timestamp: Date;
  queue: QueueMetrics;
  cache: CacheMetrics;
  executors: ExecutorMetrics;
  audit: AuditMetrics;
  healthStatus: 'healthy' | 'degraded' | 'critical';
}

/**
 * Metrics collector - aggregates data from all parallel components
 */
export class ParallelMetricsCollector {
  private buckets: ParallelMetrics[] = [];
  private readonly MAX_BUCKETS = 60; // Keep 60 minutes of data

  /**
   * Collect current metrics snapshot
   */
  collect(data: ParallelMetrics): void {
    this.buckets.push(data);

    // Keep only latest 60 buckets
    if (this.buckets.length > this.MAX_BUCKETS) {
      this.buckets.shift();
    }
  }

  /**
   * Get latest metrics
   */
  getLatest(): ParallelMetrics | null {
    return this.buckets[this.buckets.length - 1] || null;
  }

  /**
   * Get metrics history (last N minutes)
   */
  getHistory(minutes: number): ParallelMetrics[] {
    const since = this.buckets.length - Math.min(minutes, this.MAX_BUCKETS);
    return this.buckets.slice(Math.max(0, since));
  }

  /**
   * Calculate aggregates over time window
   */
  getAggregates(minutes: number = 5): {
    avgQueueSize: number;
    avgCacheHitRate: number;
    maxP99LatencyMs: number;
    avgExecutorUtilization: number;
  } {
    const history = this.getHistory(minutes);

    if (history.length === 0) {
      return {
        avgQueueSize: 0,
        avgCacheHitRate: 0,
        maxP99LatencyMs: 0,
        avgExecutorUtilization: 0
      };
    }

    const avgQueueSize = history.reduce((sum, m) => sum + m.queue.size, 0) / history.length;
    const avgCacheHitRate = history.reduce((sum, m) => sum + m.cache.totalHitRate, 0) / history.length;
    const maxP99LatencyMs = Math.max(...history.map(m => m.queue.p99WaitMs));

    const avgExecutorUtilization =
      history.reduce((sum, m) => {
        const utils = Object.values(m.executors).map(e => e.utilizationPercent);
        return sum + utils.reduce((a, b) => a + b, 0) / utils.length;
      }, 0) / history.length;

    return {
      avgQueueSize,
      avgCacheHitRate,
      maxP99LatencyMs,
      avgExecutorUtilization
    };
  }

  /**
   * Detect alerts
   */
  getAlerts(): string[] {
    const alerts: string[] = [];
    const latest = this.getLatest();

    if (!latest) return alerts;

    if (latest.queue.size > 1000) {
      alerts.push('Queue size > 1000');
    }

    if (latest.cache.totalHitRate < 60) {
      alerts.push('Cache hit rate < 60%');
    }

    if (latest.queue.p99WaitMs > 1000) {
      alerts.push('P99 wait time > 1s');
    }

    for (const [type, metrics] of Object.entries(latest.executors)) {
      if (metrics.utilizationPercent > 80) {
        alerts.push(`${type} executor utilization > 80%`);
      }
    }

    if (latest.audit.chainStatus === 'broken') {
      alerts.push('Audit chain integrity broken');
    }

    return alerts;
  }

  /**
   * Get health status
   */
  getHealthStatus(): 'healthy' | 'degraded' | 'critical' {
    const latest = this.getLatest();
    if (!latest) return 'healthy';

    const alerts = this.getAlerts();

    if (alerts.length > 5) return 'critical';
    if (alerts.length > 2) return 'degraded';
    return 'healthy';
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.buckets = [];
  }
}

// Global metrics instance
export const metricsCollector = new ParallelMetricsCollector();
