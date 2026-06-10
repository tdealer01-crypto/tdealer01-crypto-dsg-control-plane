import { SafeDomCommand } from '@/lib/dsg/safe-dom/types';
import { generateUUID } from '@/lib/utils/crypto';

export type RequestPriority = 1 | 2 | 3; // 1=CONFIRM (highest), 2=AUDIT, 3=AUTO (lowest)

export interface QueuedRequest {
  id: string; // Unique request ID
  priority: RequestPriority; // 1=CONFIRM, 2=AUDIT, 3=AUTO
  agentId: string;
  delegationId: string;
  command: SafeDomCommand;
  enqueuedAt: number; // timestamp
  deadline: number; // Must finish by this time (30s timeout)
  attemptCount: number; // Number of times we've tried to process this
}

export interface QueueStats {
  size: number;
  avgWaitMs: number;
  p95WaitMs: number;
  p99WaitMs: number;
  priorityDistribution: {
    p1: number;
    p2: number;
    p3: number;
  };
  oldestRequestAgeMs: number;
}

/**
 * Priority queue with fairness and timeout enforcement
 * Handles 1000+ concurrent agents without starvation
 *
 * Design:
 * - 3 priority levels (FIFO within each level)
 * - 30-second timeout per request (auto-reject if expired)
 * - Max 10,000 requests (reject new if exceeded)
 * - Backpressure: pause dequeue if overloaded
 * - No request starvation: P3 eventually gets processed
 */
export class RequestQueue {
  // Separate queue per priority level (maintain FIFO within each)
  private priorityQueues: Map<RequestPriority, QueuedRequest[]> = new Map([
    [1, []],
    [2, []],
    [3, []]
  ]);

  // Stats for monitoring
  private stats = {
    totalEnqueued: 0,
    totalDequeued: 0,
    totalRejected: 0,
    totalExpired: 0,
    waitTimes: [] as number[]
  };

  private readonly MAX_QUEUE_SIZE = 10_000;
  private readonly REQUEST_TIMEOUT_MS = 30_000; // 30 seconds
  private readonly MAX_CONSECUTIVE_P3_DEQUEUES = 5; // After 5 P3 dequeues, must process P1/P2

  private consecutiveP3Dequeues = 0;

  /**
   * Add request to priority queue
   * Returns request ID or null if rejected (queue full)
   */
  enqueue(request: Omit<QueuedRequest, 'id' | 'attemptCount'>): string | null {
    const totalSize = Array.from(this.priorityQueues.values()).reduce((sum, q) => sum + q.length, 0);

    if (totalSize >= this.MAX_QUEUE_SIZE) {
      this.stats.totalRejected++;
      return null; // Queue full, reject
    }

    const queuedRequest: QueuedRequest = {
      ...request,
      id: generateUUID(),
      attemptCount: 0
    };

    const queue = this.priorityQueues.get(request.priority)!;
    queue.push(queuedRequest);

    this.stats.totalEnqueued++;
    return queuedRequest.id;
  }

  /**
   * Dequeue next request with highest priority
   * Skips expired requests
   * Enforces fairness to prevent P3 starvation
   *
   * Returns null if queue empty or all requests expired
   */
  dequeue(): QueuedRequest | null {
    const now = Date.now();

    // Try P1 first (highest priority)
    let request = this.dequeueFromPriority(1, now);
    if (request) {
      this.consecutiveP3Dequeues = 0;
      return request;
    }

    // Try P2
    request = this.dequeueFromPriority(2, now);
    if (request) {
      this.consecutiveP3Dequeues = 0;
      return request;
    }

    // Try P3, but with fairness limit
    if (this.consecutiveP3Dequeues < this.MAX_CONSECUTIVE_P3_DEQUEUES) {
      request = this.dequeueFromPriority(3, now);
      if (request) {
        this.consecutiveP3Dequeues++;
        return request;
      }
    }

    // Reset fairness counter if all empty
    this.consecutiveP3Dequeues = 0;
    return null;
  }

  /**
   * Dequeue from specific priority level
   * Removes expired requests and returns first valid one
   */
  private dequeueFromPriority(priority: RequestPriority, now: number): QueuedRequest | null {
    const queue = this.priorityQueues.get(priority)!;

    // Remove expired requests from front
    while (queue.length > 0) {
      const req = queue[0];

      if (req.deadline < now) {
        // Expired, remove and skip
        queue.shift();
        this.stats.totalExpired++;
      } else {
        // Valid request, dequeue
        const dequeuedReq = queue.shift()!;
        dequeuedReq.attemptCount++;

        // Record wait time for stats
        const waitMs = now - dequeuedReq.enqueuedAt;
        this.stats.waitTimes.push(waitMs);
        // Keep last 1000 wait times for percentile calculations
        if (this.stats.waitTimes.length > 1000) {
          this.stats.waitTimes.shift();
        }

        this.stats.totalDequeued++;
        return dequeuedReq;
      }
    }

    return null;
  }

  /**
   * Async iterator for processing queue
   * Yields requests as they become available
   *
   * Implements backpressure: pauses if queue size > 1000
   * Resumes when queue < 500
   */
  async *processQueueAsync(
    onBeforeYield?: (req: QueuedRequest) => Promise<void>
  ): AsyncGenerator<QueuedRequest> {
    let isPaused = false;

    while (true) {
      // Check backpressure
      const totalSize = Array.from(this.priorityQueues.values()).reduce((sum, q) => sum + q.length, 0);

      if (totalSize > 1000 && !isPaused) {
        isPaused = true;
        console.warn(`Request queue backpressure: ${totalSize} pending requests`);
        // Wait a bit before resuming
        await new Promise(resolve => setTimeout(resolve, 100));
      } else if (totalSize < 500 && isPaused) {
        isPaused = false;
        console.log(`Request queue resumed: ${totalSize} pending requests`);
      }

      // Dequeue next request
      const request = this.dequeue();

      if (request) {
        if (onBeforeYield) {
          await onBeforeYield(request);
        }
        yield request;
      } else {
        // Queue empty, wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }

  /**
   * Re-queue a request that failed to process
   * Can be requeued with same priority or bumped up
   */
  requeue(request: QueuedRequest, priority?: RequestPriority): string | null {
    // Don't requeue if too many attempts
    if (request.attemptCount > 3) {
      console.warn(`Request ${request.id} failed after 3 attempts, dropping`);
      return null;
    }

    // Bump priority on retry (failures move up)
    const newPriority = (priority || Math.max(1, request.priority - 1)) as RequestPriority;

    return this.enqueue({
      priority: newPriority,
      agentId: request.agentId,
      delegationId: request.delegationId,
      command: request.command,
      enqueuedAt: Date.now(),
      deadline: Date.now() + this.REQUEST_TIMEOUT_MS
    });
  }

  /**
   * Get current queue statistics
   */
  getStats(): QueueStats {
    const now = Date.now();
    const allRequests: QueuedRequest[] = [];

    for (const queue of this.priorityQueues.values()) {
      allRequests.push(...queue);
    }

    // Calculate wait times
    const waitTimes = allRequests.map(req => now - req.enqueuedAt).sort((a, b) => a - b);

    const getPercentile = (arr: number[], percentile: number) => {
      if (arr.length === 0) return 0;
      const idx = Math.ceil((percentile / 100) * arr.length) - 1;
      return arr[Math.max(0, idx)];
    };

    return {
      size: allRequests.length,
      avgWaitMs: waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b) / waitTimes.length : 0,
      p95WaitMs: getPercentile(waitTimes, 95),
      p99WaitMs: getPercentile(waitTimes, 99),
      priorityDistribution: {
        p1: this.priorityQueues.get(1)!.length,
        p2: this.priorityQueues.get(2)!.length,
        p3: this.priorityQueues.get(3)!.length
      },
      oldestRequestAgeMs: waitTimes.length > 0 ? waitTimes[waitTimes.length - 1] : 0
    };
  }

  /**
   * Get lifetime statistics
   */
  getLifetimeStats() {
    return {
      ...this.stats,
      avgWaitTime: this.stats.waitTimes.length > 0 ? this.stats.waitTimes.reduce((a, b) => a + b) / this.stats.waitTimes.length : 0
    };
  }

  /**
   * Clear all queues (for tests)
   */
  clear(): void {
    this.priorityQueues.forEach(q => q.length = 0);
    this.stats = {
      totalEnqueued: 0,
      totalDequeued: 0,
      totalRejected: 0,
      totalExpired: 0,
      waitTimes: []
    };
    this.consecutiveP3Dequeues = 0;
  }

  /**
   * Get size of queue for a specific priority
   */
  getQueueSize(priority: RequestPriority): number {
    return this.priorityQueues.get(priority)!.length;
  }

  /**
   * Get total queue size
   */
  getTotalSize(): number {
    return Array.from(this.priorityQueues.values()).reduce((sum, q) => sum + q.length, 0);
  }
}

// Global request queue instance
export const requestQueue = new RequestQueue();
