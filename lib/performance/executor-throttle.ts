import { createHash } from 'crypto';

export type ExecutorType = 'virtual-pc' | 'browserbase' | 'terminal' | 'deploy';

interface ExecutorCapacity {
  type: ExecutorType;
  maxConcurrent: number;
  currentCount: number;
  orgId: string;
  peakCount: number; // For monitoring
  lastResetAt: number;
}

/**
 * ExecutionAttempt interface - tracks retry attempts and failure reasons
 * Used to enforce max retries and fingerprint blocking on repeated failures
 */
export interface ExecutionAttempt {
  taskId: string;
  fingerprint: string;
  commandId: string;
  retryCount: number;
  maxRetries: number;
  failureReasons: string[];
  firstAttemptTime: number;
  lastAttemptTime: number;
  lastError: string | null;
}

/**
 * Generate deterministic fingerprint from task properties
 * Hash of {action, target, agentId, workflowId, payload}
 * Returns 16-char hex string
 */
export function generateTaskFingerprint(task: {
  action: string;
  target?: string;
  agentId: string;
  workflowId?: string;
  payload?: Record<string, unknown>;
}): string {
  const input = JSON.stringify({
    action: task.action,
    target: task.target || '',
    agentId: task.agentId,
    workflowId: task.workflowId || '',
    payload: task.payload || {},
  });

  const hash = createHash('sha256').update(input).digest('hex');
  return hash.slice(0, 16);
}

/**
 * Executor throttle: manages concurrent session limits per executor type
 * Prevents system overload by enforcing capacity limits
 *
 * Limits (per org):
 * - Virtual PC: 50 concurrent
 * - Browserbase: 100 concurrent
 * - Terminal: 200 concurrent
 * - Deploy: 1 concurrent (serialize deploys)
 */
export class ExecutorThrottle {
  // Capacity tracking: orgId:executorType → capacity info
  private capacityRegistry = new Map<string, ExecutorCapacity>();

  // Execution attempt tracking: taskId → ExecutionAttempt
  private executionAttempts = new Map<string, ExecutionAttempt>();

  // Blocked fingerprints: set of fingerprints permanently blocked after 3 failures
  private blockedFingerprints = new Set<string>();

  private readonly CAPACITY_LIMITS: Record<ExecutorType, number> = {
    'virtual-pc': 50,
    'browserbase': 100,
    'terminal': 200,
    'deploy': 1 // Serialize deploys
  };

  private readonly DEFAULT_ORG_ID = 'default';
  private readonly MAX_RETRIES = 3;
  private readonly EXECUTION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize capacity limits for an org
   * Called on first request or manually
   */
  initializeCapacity(orgId: string = this.DEFAULT_ORG_ID): void {
    for (const executorType of Object.keys(this.CAPACITY_LIMITS) as ExecutorType[]) {
      const key = `${orgId}:${executorType}`;

      if (!this.capacityRegistry.has(key)) {
        this.capacityRegistry.set(key, {
          type: executorType,
          maxConcurrent: this.CAPACITY_LIMITS[executorType],
          currentCount: 0,
          orgId,
          peakCount: 0,
          lastResetAt: Date.now()
        });
      }
    }
  }

  /**
   * Check if we can spawn a new session for this executor type
   * Returns true if current < max
   */
  canSpawnNewSession(executorType: ExecutorType, orgId: string = this.DEFAULT_ORG_ID): boolean {
    const key = `${orgId}:${executorType}`;
    this.initializeCapacity(orgId);

    const capacity = this.capacityRegistry.get(key)!;
    return capacity.currentCount < capacity.maxConcurrent;
  }

  /**
   * Record that a new session was started
   * Call this when you successfully spin up a session
   */
  recordSessionStart(executorType: ExecutorType, orgId: string = this.DEFAULT_ORG_ID): boolean {
    const key = `${orgId}:${executorType}`;
    this.initializeCapacity(orgId);

    const capacity = this.capacityRegistry.get(key)!;

    if (capacity.currentCount < capacity.maxConcurrent) {
      capacity.currentCount++;
      if (capacity.currentCount > capacity.peakCount) {
        capacity.peakCount = capacity.currentCount;
      }
      return true;
    }

    return false;
  }

  /**
   * Record that a session ended
   * Call this when a session completes or times out
   */
  recordSessionEnd(executorType: ExecutorType, orgId: string = this.DEFAULT_ORG_ID): void {
    const key = `${orgId}:${executorType}`;
    const capacity = this.capacityRegistry.get(key);

    if (capacity) {
      capacity.currentCount = Math.max(0, capacity.currentCount - 1);
    }
  }

  /**
   * Estimate queue wait time for a request
   * If capacity available: 0ms
   * If at capacity: estimate based on typical session duration
   */
  estimateQueueTimeMs(executorType: ExecutorType, orgId: string = this.DEFAULT_ORG_ID): number {
    const key = `${orgId}:${executorType}`;
    this.initializeCapacity(orgId);

    const capacity = this.capacityRegistry.get(key)!;

    if (capacity.currentCount < capacity.maxConcurrent) {
      return 0; // Capacity available
    }

    // Rough estimate: typical session 30s, queue wait ~30s
    // More precise would require tracking actual session durations
    return 30_000;
  }

  /**
   * Get current capacity status for all executor types
   */
  getCapacityStatus(orgId: string = this.DEFAULT_ORG_ID) {
    const status: Record<ExecutorType, { current: number; max: number; utilization: number; peak: number }> =
      {} as any;

    this.initializeCapacity(orgId);

    for (const executorType of Object.keys(this.CAPACITY_LIMITS) as ExecutorType[]) {
      const key = `${orgId}:${executorType}`;
      const capacity = this.capacityRegistry.get(key)!;

      status[executorType] = {
        current: capacity.currentCount,
        max: capacity.maxConcurrent,
        utilization: capacity.maxConcurrent > 0 ? Math.round((capacity.currentCount / capacity.maxConcurrent) * 100) : 0,
        peak: capacity.peakCount
      };
    }

    return status;
  }

  /**
   * Get executor with most available capacity
   * Useful for load balancing across executors
   */
  getMostAvailableExecutor(orgId: string = this.DEFAULT_ORG_ID): ExecutorType | null {
    this.initializeCapacity(orgId);

    let bestExecutor: ExecutorType | null = null;
    let bestAvailable = 0;

    for (const executorType of Object.keys(this.CAPACITY_LIMITS) as ExecutorType[]) {
      const key = `${orgId}:${executorType}`;
      const capacity = this.capacityRegistry.get(key)!;
      const available = capacity.maxConcurrent - capacity.currentCount;

      if (available > bestAvailable) {
        bestAvailable = available;
        bestExecutor = executorType;
      }
    }

    return bestExecutor;
  }

  /**
   * Check if all executors are at capacity
   */
  isSystemOverloaded(orgId: string = this.DEFAULT_ORG_ID): boolean {
    this.initializeCapacity(orgId);

    for (const executorType of Object.keys(this.CAPACITY_LIMITS) as ExecutorType[]) {
      const key = `${orgId}:${executorType}`;
      const capacity = this.capacityRegistry.get(key)!;

      if (capacity.currentCount < capacity.maxConcurrent) {
        return false; // At least one executor has capacity
      }
    }

    return true; // All executors at capacity
  }

  /**
   * Reset capacity counters (e.g., for testing or manual recovery)
   */
  resetCapacity(orgId?: string): void {
    if (orgId) {
      // Reset specific org
      for (const executorType of Object.keys(this.CAPACITY_LIMITS) as ExecutorType[]) {
        const key = `${orgId}:${executorType}`;
        const capacity = this.capacityRegistry.get(key);
        if (capacity) {
          capacity.currentCount = 0;
          capacity.peakCount = 0;
          capacity.lastResetAt = Date.now();
        }
      }
    } else {
      // Reset all
      for (const capacity of this.capacityRegistry.values()) {
        capacity.currentCount = 0;
        capacity.peakCount = 0;
        capacity.lastResetAt = Date.now();
      }
    }
  }

  /**
   * Get global capacity stats across all orgs
   */
  getGlobalStats() {
    const stats: Record<ExecutorType, { totalCurrent: number; totalMax: number; orgs: number }> = {} as any;

    for (const executorType of Object.keys(this.CAPACITY_LIMITS) as ExecutorType[]) {
      stats[executorType] = {
        totalCurrent: 0,
        totalMax: 0,
        orgs: 0
      };
    }

    const orgSet = new Set<string>();

    for (const [key, capacity] of this.capacityRegistry.entries()) {
      orgSet.add(capacity.orgId);
      stats[capacity.type].totalCurrent += capacity.currentCount;
      stats[capacity.type].totalMax += capacity.maxConcurrent;
    }

    for (const executorType of Object.keys(this.CAPACITY_LIMITS) as ExecutorType[]) {
      stats[executorType].orgs = orgSet.size;
    }

    return {
      stats,
      totalOrgs: orgSet.size,
      totalSessions: Array.from(this.capacityRegistry.values()).reduce((sum, c) => sum + c.currentCount, 0)
    };
  }

  /**
   * Clear all capacity tracking (for tests)
   */
  clear(): void {
    this.capacityRegistry.clear();
  }

  /**
   * PHASE 1: Record task execution attempt with retry tracking
   */
  recordTaskAttempt(
    taskId: string,
    fingerprint: string,
    executor: string,
    error?: Error
  ): ExecutionAttempt {
    let attempt = this.executionAttempts.get(taskId);

    if (!attempt) {
      attempt = {
        taskId,
        fingerprint,
        commandId: '',
        retryCount: 0,
        maxRetries: this.MAX_RETRIES,
        failureReasons: [],
        firstAttemptTime: Date.now(),
        lastAttemptTime: Date.now(),
        lastError: error ? error.message : null,
      };
      this.executionAttempts.set(taskId, attempt);
    } else {
      attempt.retryCount++;
      attempt.lastAttemptTime = Date.now();
      attempt.lastError = error ? error.message : null;
    }

    if (error) {
      const reason = error.message || String(error);
      if (!attempt.failureReasons.includes(reason)) {
        attempt.failureReasons.push(reason);
      }
    }

    return attempt;
  }

  /**
   * PHASE 1: Check if a task can be retried
   */
  canRetryTask(taskId: string, fingerprint: string, failureReason?: string): {
    allowed: boolean;
    reason?: string;
  } {
    // Check if fingerprint is permanently blocked
    if (this.blockedFingerprints.has(fingerprint)) {
      return {
        allowed: false,
        reason: 'Fingerprint blocked after 3 identical failures',
      };
    }

    const attempt = this.executionAttempts.get(taskId);
    if (!attempt) {
      return { allowed: true };
    }

    // Check max retries exceeded
    if (attempt.retryCount >= this.MAX_RETRIES) {
      return {
        allowed: false,
        reason: `Max retries (${this.MAX_RETRIES}) exceeded`,
      };
    }

    // Check total timeout
    const elapsed = Date.now() - attempt.firstAttemptTime;
    if (elapsed > this.EXECUTION_TIMEOUT_MS) {
      return {
        allowed: false,
        reason: `Total execution timeout (${this.EXECUTION_TIMEOUT_MS}ms) exceeded`,
      };
    }

    return { allowed: true };
  }

  /**
   * PHASE 1: Block a fingerprint after 3 identical failures
   */
  blockFingerprint(fingerprint: string, failureReason: string): void {
    this.blockedFingerprints.add(fingerprint);
  }

  /**
   * PHASE 1: Get attempt info for a task
   */
  getAttempt(taskId: string): ExecutionAttempt | undefined {
    return this.executionAttempts.get(taskId);
  }

  /**
   * PHASE 1: Check if a fingerprint is blocked
   */
  isFingerprinted(fingerprint: string): boolean {
    return this.blockedFingerprints.has(fingerprint);
  }

  /**
   * PHASE 1: Clear all attempt and fingerprint tracking (for tests)
   */
  clearAttempts(): void {
    this.executionAttempts.clear();
    this.blockedFingerprints.clear();
  }
}

// Global executor throttle instance
export const executorThrottle = new ExecutorThrottle();
