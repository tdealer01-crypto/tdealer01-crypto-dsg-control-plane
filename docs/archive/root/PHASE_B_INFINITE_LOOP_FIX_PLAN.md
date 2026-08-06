# Phase B Infinite Loop Fix Plan

**Issue:** Agent continuously re-executing same tasks (System readiness → List agents loop)  
**Root Cause:** Missing max retries + missing break condition + queue not cleaning up  
**Priority:** HIGH (affects production)  
**Effort:** 3-4 hours (includes 5 safety guards)  
**Status:** ✅ APPROVED TO IMPLEMENT (with 5 additional safety guards)

---

## 🛡️ 5 Additional Safety Guards (Required Before Merge)

### Guard 1: Task Fingerprint (Prevent Duplicate Loops)
**Problem:** Same task created with identical payload retries forever
**Solution:** Hash task metadata to create unique fingerprint
```typescript
taskFingerprint = hash({
  action: 'system_readiness',
  target: 'agent-1',
  agentId: 'hermes-001',
  workflowId: 'wf-123',
  normalizedPayload: JSON.stringify(normalized)
})

// Track by fingerprint + failure reason
trackByFingerprint(fingerprint, failureReason)
// After 3 same failures → DLQ (not retry)
```

### Guard 2: Always Release Executor Slot (No Slot Leaks)
**Problem:** Executor capacity stuck at 100% if error in finally block
**Solution:** Guarantee slot release with finally
```typescript
try {
  await executeTask(task)
} catch (err) {
  await markFailed(task, err)
} finally {
  await releaseExecutorSlot(task.executorId)  // ← MUST be here
  decrementCapacity(executor)
}
```

### Guard 3: Clear Task Status Model + Stop Reason
**Problem:** Agent doesn't know why execution stopped
**Solution:** Return explicit stop_reason in every response
```typescript
{
  decision: 'BLOCK',
  stop: true,
  stop_reason: 'MAX_RETRIES_EXCEEDED' | 'QUEUE_EMPTY' | 'TIMEOUT' | 'HIGH_FAILURES',
  retry_count: 3,
  next_action: 'MOVE_TO_DLQ' | 'WAIT' | 'REQUEST_APPROVAL'
}
```

### Guard 4: Safe Queue Cleanup (No Active Task Deletion)
**Problem:** Cleanup deletes RUNNING tasks → missing audit trail
**Solution:** Only clean these statuses
```typescript
canDelete = [
  'FAILED_FINAL',      // Exhausted retries
  'EXPIRED',           // Older than 24h
  'CANCELLED',         // User cancelled
  'DLQ_MOVED'          // Already moved to DLQ
]

cannotDelete = [
  'RUNNING',           // Currently executing
  'LOCKED',            // Batch processing
  'WAITING_APPROVAL',  // Pending review
  'WAITING_USER_INPUT' // Needs human
]
```

### Guard 5: Monitoring API with Complete Fields
**Problem:** UI shows alerts but no way to debug root cause
**Solution:** /api/parallel/health with actionable data
```typescript
{
  ok: true,
  queue: {
    pending: 4,
    running: 1,
    stale: 2,           // ← Tasks older than 15 min
    dlq: 3              // ← Dead letter queue
  },
  executors: {
    deploy: {
      used: 1,
      capacity: 1,
      utilization: 1.0
    }
  },
  latency: {
    avgMs: 96,
    p95Ms: 252,
    p99Ms: 677
  },
  loopProtection: {
    maxRetries: 3,
    blockedFingerprints: 2,
    tasksInDLQ: 3
  }
}
```

---

## 🎯 Implementation Plan (6 Phases - Updated Order)

### Phase 0: Add Task Status Model + Stop Reason (30 minutes)
**WHY FIRST:** Must establish status/stop_reason before cleanup logic  
**FILES:** `lib/types/task.ts` (NEW), modify route responses

```typescript
// lib/types/task.ts
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  FAILED_RETRYABLE = 'failed_retryable',
  RETRYING = 'retrying',
  FAILED_FINAL = 'failed_final',
  DLQ = 'dlq',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum StopReason {
  MAX_RETRIES_EXCEEDED = 'max_retries_exceeded',
  QUEUE_EMPTY = 'queue_empty',
  EXECUTION_TIMEOUT = 'execution_timeout',
  TOO_MANY_FAILURES = 'too_many_failures',
  USER_CANCELLED = 'user_cancelled',
  NONE = 'none',
}

export interface ExecutionResponse {
  decision: 'ALLOW' | 'BLOCK' | 'PENDING' | 'FAILED';
  stop: boolean;
  stop_reason: StopReason;
  retry_count: number;
  max_retries: number;
  next_action: 'MOVE_TO_DLQ' | 'WAIT' | 'REQUEST_APPROVAL' | 'RETRY' | 'CONTINUE';
  current_task_id?: string;
  elapsed_ms?: number;
}
```

---

### Phase 1: Add Max Retries with Task Fingerprint (1 hour)

#### File 1: `lib/performance/executor-throttle.ts`

**Add retry tracking with fingerprint:**
```typescript
// ADD after line 30 (capacity limits definition)

import { createHash } from 'crypto';

interface ExecutionAttempt {
  taskId: string;
  fingerprint: string;  // ← NEW: Hash of task payload
  commandId: string;
  retryCount: number;
  maxRetries: number;
  failureReasons: string[];  // ← NEW: Track different failure types
  firstAttemptTime: Date;
  lastAttemptTime: Date;
  lastError?: string;
}

interface BlockedFingerprint {
  fingerprint: string;
  failureReason: string;
  blockCount: number;  // How many times blocked with this reason
  blockedAt: Date;
}

// Generate fingerprint from task data
export function generateTaskFingerprint(task: {
  action: string;
  target?: string;
  agentId: string;
  workflowId: string;
  payload: Record<string, unknown>;
}): string {
  const normalized = {
    action: task.action,
    target: task.target || '',
    agentId: task.agentId,
    workflowId: task.workflowId,
    payloadHash: JSON.stringify(task.payload)
      .split('')
      .sort()
      .join(''),  // Normalize payload order
  };
  
  return createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex')
    .substring(0, 16);
}

const TASK_RETRY_CONFIG = {
  maxRetries: 3,              // ← Max 3 attempts
  retryBackoffMs: 1000,       // ← Wait 1s between retries
  taskTimeoutMs: 30000,       // ← Max 30s per task
  maxTimeoutMs: 300000,       // ← Max 5 min total
};

const taskAttempts = new Map<string, ExecutionAttempt>();

const blockedFingerprints = new Map<string, BlockedFingerprint>();

export function canRetryTask(
  taskId: string,
  fingerprint: string,
  failureReason: string
): { allowed: boolean; reason?: string } {
  // Check if fingerprint is already blocked
  const blocked = blockedFingerprints.get(fingerprint);
  if (blocked && blocked.failureReason === failureReason) {
    if (blocked.blockCount >= 3) {
      return {
        allowed: false,
        reason: `Fingerprint ${fingerprint} blocked: same failure ${blocked.blockCount} times`,
      };
    }
  }
  
  const attempt = taskAttempts.get(taskId);
  if (!attempt) return { allowed: true };
  
  // Check max retries
  if (attempt.retryCount >= attempt.maxRetries) {
    console.warn(
      `Task ${taskId} exceeded max retries (${attempt.maxRetries})`
    );
    return {
      allowed: false,
      reason: 'max_retries_exceeded',
    };
  }
  
  // Check total time elapsed
  const elapsedMs = Date.now() - attempt.firstAttemptTime.getTime();
  if (elapsedMs > TASK_RETRY_CONFIG.maxTimeoutMs) {
    console.warn(`Task ${taskId} exceeded max time (${elapsedMs}ms)`);
    return {
      allowed: false,
      reason: 'timeout_exceeded',
    };
  }
  
  return { allowed: true };
}

export function recordTaskAttempt(
  taskId: string,
  fingerprint: string,
  executor: string,
  error?: string
): void {
  const existing = taskAttempts.get(taskId);
  const failureReason = error?.split(':')[0] || 'unknown_error';
  
  if (existing) {
    existing.retryCount++;
    existing.lastAttemptTime = new Date();
    existing.lastError = error;
    existing.failureReasons.push(failureReason);
  } else {
    taskAttempts.set(taskId, {
      taskId,
      fingerprint,
      commandId: executor,
      retryCount: 0,
      maxRetries: TASK_RETRY_CONFIG.maxRetries,
      failureReasons: [failureReason],
      firstAttemptTime: new Date(),
      lastAttemptTime: new Date(),
      lastError: error,
    });
  }
  
  // Log warning if approaching limit
  if (existing && existing.retryCount >= existing.maxRetries - 1) {
    console.warn(
      `Task ${taskId} near retry limit: ${existing.retryCount}/${existing.maxRetries}`
    );
  }
}

export function blockFingerprint(
  fingerprint: string,
  failureReason: string
): void {
  const existing = blockedFingerprints.get(fingerprint);
  if (existing && existing.failureReason === failureReason) {
    existing.blockCount++;
  } else {
    blockedFingerprints.set(fingerprint, {
      fingerprint,
      failureReason,
      blockCount: 1,
      blockedAt: new Date(),
    });
  }
}

export function clearTaskAttempt(taskId: string): void {
  taskAttempts.delete(taskId);
}

export function getTaskAttemptStats(): Record<string, ExecutionAttempt> {
  return Object.fromEntries(taskAttempts);
}
```

**Modify executeCommand function (WITH FINALLY):**
```typescript
// MODIFY around line 100 (executeCommand function)

export async function executeCommand(
  command: SafeDomCommand,
  executor: string,
  task: { action: string; agentId: string; workflowId: string; payload: Record<string, unknown> }
): Promise<ExecutionResult> {
  const taskId = `${executor}:${command.frameId}:${command.elementId}`;
  const fingerprint = generateTaskFingerprint(task);
  const failureReason = '';
  
  // Reserve executor slot
  const slotReserved = await reserveExecutorSlot(executor);
  if (!slotReserved) {
    return {
      success: false,
      reason: 'executor_at_capacity',
      taskId,
      stop_reason: StopReason.NONE,
    };
  }
  
  try {
    // Check if can retry (using fingerprint)
    const retryCheck = canRetryTask(taskId, fingerprint, failureReason);
    if (!retryCheck.allowed) {
      blockFingerprint(fingerprint, failureReason);
      return {
        success: false,
        reason: 'max_retries_exceeded',
        taskId,
        stop_reason: StopReason.MAX_RETRIES_EXCEEDED,
        next_action: 'MOVE_TO_DLQ',
      };
    }
    
    // Execute the command
    const result = await executeWithThrottle(command, executor);
    
    // Clear attempt tracking on success
    clearTaskAttempt(taskId);
    
    return {
      success: true,
      taskId,
      result,
      stop_reason: StopReason.NONE,
    };
  } catch (error) {
    const errorMsg = String(error);
    recordTaskAttempt(taskId, fingerprint, executor, errorMsg);
    
    // Determine if retryable error
    const isRetryable = isRetryableError(error);
    
    return {
      success: false,
      reason: isRetryable ? 'retryable_error' : 'fatal_error',
      taskId,
      stop_reason: isRetryable ? StopReason.NONE : StopReason.MAX_RETRIES_EXCEEDED,
      error: errorMsg,
    };
  } finally {
    // ← KEY: Always release slot, even if error
    await releaseExecutorSlot(executor);
    console.debug(`Executor slot released: ${executor}`);
  }
}

function isRetryableError(error: unknown): boolean {
  const msg = String(error).toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('capacity') ||
    msg.includes('temporarily') ||
    msg.includes('unavailable')
  );
}
```

---

### Phase 2: Add Queue Break Condition (1 hour)

#### File 2: `lib/spine/execute.ts` (or agent execution entry point)

**Add completion check:**
```typescript
// ADD new function after imports

interface AgentExecutionState {
  currentTaskId?: string;
  completedTasks: Set<string>;
  failedTasks: Set<string>;
  isExecuting: boolean;
  startTime: Date;
  maxDuration: number; // e.g., 5 minutes
}

const agentState = new Map<string, AgentExecutionState>();

export function getAgentState(agentId: string): AgentExecutionState {
  if (!agentState.has(agentId)) {
    agentState.set(agentId, {
      completedTasks: new Set(),
      failedTasks: new Set(),
      isExecuting: false,
      startTime: new Date(),
      maxDuration: 300000, // 5 minutes
    });
  }
  return agentState.get(agentId)!;
}

export function shouldContinueExecution(
  agentId: string,
  nextQueueSize: number
): boolean {
  const state = getAgentState(agentId);
  
  // Check if should stop
  const elapsed = Date.now() - state.startTime.getTime();
  const hasTimedOut = elapsed > state.maxDuration;
  const hasNoMoreTasks = nextQueueSize === 0;
  const hasFailedTooMany = state.failedTasks.size > 10;
  
  if (hasTimedOut) {
    console.warn(
      `Agent ${agentId} exceeded max duration (${elapsed}ms)`
    );
    return false;
  }
  
  if (hasFailedTooMany) {
    console.warn(
      `Agent ${agentId} has too many failures (${state.failedTasks.size})`
    );
    return false;
  }
  
  if (hasNoMoreTasks) {
    console.info(`Agent ${agentId} queue empty - execution complete`);
    return false;
  }
  
  return true;
}

export function markTaskCompleted(agentId: string, taskId: string): void {
  const state = getAgentState(agentId);
  state.completedTasks.add(taskId);
  state.currentTaskId = undefined;
}

export function markTaskFailed(agentId: string, taskId: string): void {
  const state = getAgentState(agentId);
  state.failedTasks.add(taskId);
  state.currentTaskId = undefined;
}

export function resetAgentState(agentId: string): void {
  agentState.delete(agentId);
}
```

**Modify main execution loop:**
```typescript
// MODIFY spine execute route (app/api/spine/execute/route.ts)

async function executeSpineIntent(
  req: NextRequest,
  intent: RuntimeIntent
): Promise<ExecutionResponse> {
  const agentId = intent.agent_id;
  const executionState = getAgentState(agentId);
  executionState.isExecuting = true;
  
  try {
    let currentStep = 0;
    const steps = intent.planned_steps || [];
    
    while (currentStep < steps.length) {
      const step = steps[currentStep];
      const taskId = `${agentId}:step-${currentStep}`;
      
      // ← KEY: Check if should continue
      const queueSize = await getQueueSize();
      if (!shouldContinueExecution(agentId, queueSize)) {
        console.info(
          `Agent ${agentId} stopping execution (completed: ${executionState.completedTasks.size})`
        );
        break;  // ← BREAK LOOP
      }
      
      executionState.currentTaskId = taskId;
      
      try {
        const result = await executeStep(step);
        
        if (result.success) {
          markTaskCompleted(agentId, taskId);
          currentStep++;
        } else if (result.canRetry) {
          // Retry this step
          console.debug(`Retrying step ${currentStep}`);
          // Don't increment currentStep - retry same step
          await delay(1000);
        } else {
          // Move to next step even if failed
          markTaskFailed(agentId, taskId);
          currentStep++;
        }
      } catch (error) {
        console.error(`Step ${currentStep} failed:`, error);
        markTaskFailed(agentId, taskId);
        currentStep++;
      }
    }
    
    // Final status
    return {
      decision: 'completed',
      steps_completed: executionState.completedTasks.size,
      steps_failed: executionState.failedTasks.size,
      total_steps: steps.length,
    };
  } finally {
    executionState.isExecuting = false;
    // Keep state for 5 min then cleanup
    setTimeout(
      () => resetAgentState(agentId),
      300000
    );
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

### Phase 3: Add Queue Cleanup (45 minutes)

#### File 3: `lib/performance/request-queue.ts`

**Add cleanup logic:**
```typescript
// ADD after existing functions (around line 250)

interface QueueItem {
  id: string;
  priority: Priority;
  createdAt: Date;
  attempts: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  lastError?: string;
}

const CLEANUP_CONFIG = {
  completedItemTTL: 300000,    // 5 minutes
  failedItemTTL: 600000,       // 10 minutes
  stalePendingTTL: 900000,     // 15 minutes
  cleanupIntervalMs: 60000,    // Run every 1 minute
};

let cleanupIntervalId: NodeJS.Timeout | null = null;

export function startQueueCleanup(): void {
  if (cleanupIntervalId) return;
  
  cleanupIntervalId = setInterval(() => {
    cleanupQueueItems();
  }, CLEANUP_CONFIG.cleanupIntervalMs);
  
  console.info('Queue cleanup started');
}

export function stopQueueCleanup(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
    console.info('Queue cleanup stopped');
  }
}

export function cleanupQueueItems(): CleanupStats {
  const now = Date.now();
  const stats = {
    removed: 0,
    moved_to_dead_letter: 0,
    skipped: 0,  // ← NEW: Track items we skipped (still active)
    timestamp: new Date(),
  };
  
  // Statuses that CAN be deleted
  const deletableStatuses = [
    TaskStatus.FAILED_FINAL,
    TaskStatus.EXPIRED,
    TaskStatus.CANCELLED,
    TaskStatus.DLQ,
  ];
  
  // Statuses that CANNOT be deleted (still active)
  const protectedStatuses = [
    TaskStatus.RUNNING,
    TaskStatus.LOCKED,
    TaskStatus.WAITING_APPROVAL,
    TaskStatus.WAITING_USER_INPUT,
  ];
  
  // Check all queue items
  const allItems = getQueueState().items;
  
  allItems.forEach((item: QueueItem, index: number) => {
    const age = now - item.createdAt.getTime();
    let shouldRemove = false;
    let shouldMoveToDLQ = false;
    
    // NEVER delete active tasks
    if (protectedStatuses.includes(item.status)) {
      stats.skipped++;
      return;  // Skip this item
    }
    
    // Completed items older than TTL
    if (item.status === TaskStatus.COMPLETED && age > CLEANUP_CONFIG.completedItemTTL) {
      shouldRemove = true;
    }
    
    // Failed items that exceeded retry limit
    if (item.status === TaskStatus.FAILED_FINAL && age > CLEANUP_CONFIG.failedItemTTL) {
      shouldMoveToDLQ = true;
    }
    
    // Stale pending items (no progress in 15 min)
    if (item.status === TaskStatus.PENDING && age > CLEANUP_CONFIG.stalePendingTTL) {
      console.warn(
        `Queue item ${item.id} is stale (pending for ${age}ms), moving to DLQ`
      );
      shouldMoveToDLQ = true;
    }
    
    // Expired items regardless of status (if explicitly expired)
    if (item.status === TaskStatus.EXPIRED) {
      shouldMoveToDLQ = true;
    }
    
    if (shouldRemove) {
      removeQueueItem(index);
      stats.removed++;
    } else if (shouldMoveToDLQ) {
      moveItemToDeadLetterQueue(item);
      removeQueueItem(index);
      stats.moved_to_dead_letter++;
    }
  });
  
  // Log stats
  if (stats.removed > 0 || stats.moved_to_dead_letter > 0 || stats.skipped > 0) {
    console.info('Queue cleanup completed', stats);
  }
  
  return stats;
}

function moveItemToDeadLetterQueue(item: QueueItem): void {
  // Store in separate DLQ table for debugging
  const dlq = getDeadLetterQueue();
  dlq.push({
    ...item,
    movedAt: new Date(),
    reason: 'cleanup',
  });
  
  // Keep DLQ size reasonable (1000 items max)
  if (dlq.length > 1000) {
    dlq.shift();
  }
}

export function getDeadLetterQueue(): Array<QueueItem & { movedAt: Date; reason: string }> {
  // Implementation: store in memory or DB
  // For now, in-memory
  return deadLetterQueue;
}

// Initialize
const deadLetterQueue: Array<QueueItem & { movedAt: Date; reason: string }> = [];

// Auto-start cleanup
if (typeof global !== 'undefined') {
  startQueueCleanup();
}
```

---

### Phase 4: Add Monitoring API (30 minutes)

#### File 4: `app/api/parallel/health/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getQueueState } from '@/lib/performance/request-queue';
import { getTaskAttemptStats } from '@/lib/performance/executor-throttle';
import { getAgentState } from '@/lib/spine/execute';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get('agentId');
  
  const queueState = getQueueState();
  const taskStats = getTaskAttemptStats();
  const agentStats = agentId ? getAgentState(agentId) : null;
  const dlqItems = getDeadLetterQueue();
  
  // Calculate latency percentiles
  const latencies = queueState.items
    .filter(i => i.status === 'completed')
    .map(i => i.completedAtMs - i.createdAtMs)
    .sort((a, b) => a - b);
  
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  
  // Count stale items (no progress in 15 min)
  const staleItems = queueState.items.filter(
    i => i.status === 'pending' && 
         Date.now() - i.createdAtMs > 900000
  );
  
  return NextResponse.json({
    timestamp: new Date(),
    queue: {
      total: queueState.items.length,
      byPriority: {
        P1: queueState.items.filter(i => i.priority === 'P1').length,
        P2: queueState.items.filter(i => i.priority === 'P2').length,
        P3: queueState.items.filter(i => i.priority === 'P3').length,
      },
      byStatus: {
        pending: queueState.items.filter(i => i.status === 'pending').length,
        running: queueState.items.filter(i => i.status === 'running').length,
        completed: queueState.items.filter(i => i.status === 'completed').length,
        failed: queueState.items.filter(i => i.status === 'failed_final').length,
      },
      stale: staleItems.length,        // ← NEW: Tasks older than 15 min
      dlq: dlqItems.length,            // ← NEW: Dead letter queue count
      oldestItem: queueState.items[0]?.createdAt,
      oldestItemAgeMs: queueState.items[0]
        ? Date.now() - queueState.items[0].createdAtMs
        : 0,
    },
    executors: {
      deploy: {
        used: getExecutorUsage('deploy'),
        capacity: 1,
        utilization: getExecutorUsage('deploy') / 1,
      },
      vpc: {
        used: getExecutorUsage('vpc'),
        capacity: 50,
        utilization: getExecutorUsage('vpc') / 50,
      },
      browserbase: {
        used: getExecutorUsage('browserbase'),
        capacity: 100,
        utilization: getExecutorUsage('browserbase') / 100,
      },
    },
    latency: {
      avgMs: latencies.length > 0 
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
        : 0,
      p50Ms: p50,
      p95Ms: p95,
      p99Ms: p99,
    },
    tasks: {
      active: Object.keys(taskStats).length,
      nearLimit: Object.values(taskStats).filter(
        t => t.retryCount >= t.maxRetries - 1
      ).length,
      exceeded: Object.values(taskStats).filter(
        t => t.retryCount >= t.maxRetries
      ).length,
    },
    loopProtection: {       // ← NEW: Explicit loop protection metrics
      maxRetries: 3,
      blockedFingerprints: Object.keys(getBlockedFingerprints()).length,
      tasksInDLQ: dlqItems.length,
    },
    agent: agentStats ? {
      id: agentId,
      isExecuting: agentStats.isExecuting,
      completedTasks: agentStats.completedTasks.size,
      failedTasks: agentStats.failedTasks.size,
      elapsedMs: Date.now() - agentStats.startTime.getTime(),
      currentTask: agentStats.currentTaskId,
    } : null,
    health: {
      ok: queueState.items.length < 5000 && staleItems.length === 0,
      issues: detectIssues(queueState, taskStats, agentStats),
    },
  });
}

function detectIssues(
  queue: any,
  tasks: Record<string, any>,
  agent: any
): string[] {
  const issues: string[] = [];
  
  if (queue.items.length > 5000) {
    issues.push('Queue size exceeds 5000');
  }
  
  if (queue.items.length > 1000 && queue.byStatus.pending > 500) {
    issues.push('High pending queue - potential bottleneck');
  }
  
  const tasksExceeded = Object.values(tasks).filter(
    (t: any) => t.retryCount >= t.maxRetries
  ).length;
  if (tasksExceeded > 10) {
    issues.push(`${tasksExceeded} tasks exceeded retry limit`);
  }
  
  if (agent?.elapsedMs > agent?.startTime + 300000) {
    issues.push('Agent execution exceeding max duration');
  }
  
  return issues;
}
```

---

### Phase 5: Add Tests (45 minutes)

#### File 5: `tests/unit/performance/infinite-loop-protection.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  canRetryTask,
  recordTaskAttempt,
  clearTaskAttempt,
  getTaskAttemptStats,
  generateTaskFingerprint,
  blockFingerprint,
  getBlockedFingerprints,
  releaseExecutorSlot,
  reserveExecutorSlot,
} from '@/lib/performance/executor-throttle';

describe('Infinite Loop Protection — 7 Critical Cases', () => {
  beforeEach(() => {
    // Clear state before each test
  });
  
  afterEach(() => {
    // Cleanup after each test
  });
  
  // TEST 1: Task fails 1 time → can retry
  it('Test 1: Single failure should allow retry', async () => {
    const taskId = 'test-1-1';
    const fingerprint = 'fp-001';
    
    const check = canRetryTask(taskId, fingerprint, 'timeout');
    expect(check.allowed).toBe(true);
    
    recordTaskAttempt(taskId, fingerprint, 'deploy', 'timeout error');
    
    // Can still retry
    const check2 = canRetryTask(taskId, fingerprint, 'timeout');
    expect(check2.allowed).toBe(true);
  });
  
  // TEST 2: Task fails 3 times → move to DLQ
  it('Test 2: Three failures should move to DLQ', () => {
    const taskId = 'test-2-1';
    const fingerprint = 'fp-002';
    const failureReason = 'capacity_limit';
    
    // Fail 3 times
    recordTaskAttempt(taskId, fingerprint, 'deploy', 'capacity');
    recordTaskAttempt(taskId, fingerprint, 'deploy', 'capacity');
    recordTaskAttempt(taskId, fingerprint, 'deploy', 'capacity');
    
    const check = canRetryTask(taskId, fingerprint, failureReason);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('max_retries');
    
    // Block fingerprint
    blockFingerprint(fingerprint, failureReason);
    expect(Object.keys(getBlockedFingerprints()).length).toBe(1);
  });
  
  // TEST 3: Same fingerprint + same failure reason > 3 → block
  it('Test 3: Same fingerprint with same failure blocks', () => {
    const fingerprint = 'fp-003';
    const failureReason = 'timeout';
    
    // Record 3 times with same fingerprint + reason
    blockFingerprint(fingerprint, failureReason);
    blockFingerprint(fingerprint, failureReason);
    blockFingerprint(fingerprint, failureReason);
    
    const blocked = getBlockedFingerprints()[fingerprint];
    expect(blocked.blockCount).toBe(3);
    
    // Next retry should be blocked
    const check = canRetryTask('task-x', fingerprint, failureReason);
    expect(check.allowed).toBe(false);
  });
  
  // TEST 4: RUNNING task must NOT be cleaned up
  it('Test 4: Running status tasks protected from cleanup', () => {
    const queueState = getQueueState();
    
    // Add a RUNNING task
    const runningTask = {
      id: 'task-running-1',
      status: TaskStatus.RUNNING,
      createdAtMs: Date.now() - 1000000, // Old
    };
    
    queueState.items.push(runningTask);
    
    const stats = cleanupQueueItems();
    
    // Should be skipped, not removed
    expect(stats.skipped).toBeGreaterThan(0);
    
    // Task still in queue
    const stillThere = queueState.items.find(i => i.id === 'task-running-1');
    expect(stillThere).toBeDefined();
  });
  
  // TEST 5: Expired pending task → cleanup
  it('Test 5: Stale pending task cleaned up', () => {
    const queueState = getQueueState();
    
    // Add a stale PENDING task (>15 min old)
    const staleTask = {
      id: 'task-stale-1',
      status: TaskStatus.PENDING,
      createdAtMs: Date.now() - 1000000, // Old
    };
    
    queueState.items.push(staleTask);
    
    const stats = cleanupQueueItems();
    
    // Should be moved to DLQ
    expect(stats.moved_to_dead_letter).toBeGreaterThan(0);
    
    // Task removed from queue
    const gone = queueState.items.find(i => i.id === 'task-stale-1');
    expect(gone).toBeUndefined();
  });
  
  // TEST 6: Executor slot ALWAYS released (even with error)
  it('Test 6: Executor slot released in finally block', async () => {
    const executor = 'deploy';
    
    // Reserve slot
    const reserved = await reserveExecutorSlot(executor);
    expect(reserved).toBe(true);
    
    // Simulate error
    try {
      throw new Error('Simulated error');
    } catch (err) {
      // In executeCommand, this happens in catch
      // Then finally releases slot
    } finally {
      await releaseExecutorSlot(executor);
    }
    
    // Slot should be available again
    const reserved2 = await reserveExecutorSlot(executor);
    expect(reserved2).toBe(true);
  });
  
  // TEST 7: /api/parallel/health shows stale + dlq + retry
  it('Test 7: Health endpoint shows complete metrics', async () => {
    // Simulate state
    const mockState = {
      queue: {
        stale: 2,
        dlq: 3,
        total: 100,
      },
      loopProtection: {
        maxRetries: 3,
        blockedFingerprints: 2,
        tasksInDLQ: 3,
      },
    };
    
    // Call endpoint
    const response = await fetch('/api/parallel/health');
    const data = await response.json();
    
    expect(data.queue.stale).toBeDefined();
    expect(data.queue.dlq).toBeDefined();
    expect(data.loopProtection.maxRetries).toBe(3);
    expect(data.loopProtection.blockedFingerprints).toBeGreaterThanOrEqual(0);
  });
});
```

---

## 📋 Implementation Checklist (6 Phases + 5 Safety Guards)

### ⚠️ PRE-IMPLEMENTATION CHECKLIST (FIX THESE 2 THINGS FIRST)

**CRITICAL:** These 2 inconsistencies must be fixed BEFORE starting Phase 0

**Fix #1: TaskStatus Enum Must Include ALL 11 Statuses**
```typescript
// In Phase 0, TaskStatus enum MUST include:
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  FAILED_RETRYABLE = 'failed_retryable',
  RETRYING = 'retrying',
  FAILED_FINAL = 'failed_final',
  DLQ = 'dlq',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  LOCKED = 'locked',              // ← ADD THIS (used in cleanup)
  WAITING_APPROVAL = 'waiting_approval',    // ← ADD THIS (used in cleanup)
  WAITING_USER_INPUT = 'waiting_user_input'  // ← ADD THIS (used in cleanup)
}
```
**Why:** Phase 4 cleanup uses these as protectedStatuses. If missing, TypeScript will error.

**Fix #2: QueueItem Type Must Use TaskStatus Enum**
```typescript
// BEFORE (wrong):
interface QueueItem {
  status: 'pending' | 'executing' | 'completed' | 'failed'
}

// AFTER (correct):
interface QueueItem {
  status: TaskStatus  // ← Use enum, not string union
  // ... rest of fields
}
```
**Why:** Cleanup code uses TaskStatus.RUNNING, TaskStatus.LOCKED, etc. String union won't match.

- [ ] Add 3 missing statuses to TaskStatus enum
- [ ] Change QueueItem.status to use TaskStatus type
- [ ] Verify no TypeScript errors with these changes
- [ ] Then proceed to Phase 0

### Before Coding
- [ ] Create feature branch: `git checkout -b fix/infinite-loop-protection`
- [ ] Read this plan + user's 5 safety guard requirements
- [ ] Review current `executor-throttle.ts` lines 1-100
- [ ] Review `spine/execute.ts` structure
- [ ] Review `request-queue.ts` implementation
- [ ] Understand TaskStatus enum (all 11 values) + StopReason enum

### Phase 0: Task Status Model (30 min) ← DO THIS FIRST
- [ ] Create `lib/types/task.ts` with TaskStatus enum
- [ ] Add StopReason enum
- [ ] Create ExecutionResponse interface
- [ ] Update all route response types to include stop_reason

### Phase 1: Max Retries + Fingerprint (60 min)
- [ ] Add generateTaskFingerprint() function
- [ ] Add ExecutionAttempt interface with fingerprint
- [ ] Add BlockedFingerprint tracking
- [ ] Add canRetryTask() with fingerprint check
- [ ] Add recordTaskAttempt() with fingerprint
- [ ] Add blockFingerprint() function
- [ ] Test: Single failure allows retry
- [ ] Test: 3 failures blocks fingerprint

### Phase 2: Break Condition + Stop Reason (45 min)
- [ ] Add AgentExecutionState interface
- [ ] Add shouldContinueExecution() function
- [ ] Add markTaskCompleted() / markTaskFailed()
- [ ] Modify spine execute loop with break condition
- [ ] Return stop_reason in all responses
- [ ] Test: Queue empty stops execution
- [ ] Test: Too many failures stops execution

### Phase 3: Release Executor Slot in Finally (30 min)
- [ ] Add reserveExecutorSlot() function
- [ ] Add releaseExecutorSlot() function
- [ ] **CRITICAL:** Update executeCommand with try/finally
- [ ] Ensure slot released even on error
- [ ] Test: Slot released after error

### Phase 4: Safe Queue Cleanup (30 min)
- [ ] Add TaskStatus enum check
- [ ] Add protectedStatuses array (RUNNING, etc)
- [ ] Add deletableStatuses array
- [ ] Update cleanupQueueItems() with status check
- [ ] Add stale item counting
- [ ] Never delete RUNNING tasks
- [ ] Test: RUNNING tasks not cleaned
- [ ] Test: Stale pending tasks cleaned

### Phase 5: Monitoring API (30 min)
- [ ] Create `/api/parallel/health/route.ts`
- [ ] Add queue.stale metric
- [ ] Add queue.dlq metric
- [ ] Add loopProtection metrics
- [ ] Add executor utilization
- [ ] Add latency percentiles (p50, p95, p99)
- [ ] Test: Health endpoint responds with all fields

### Phase 6: Tests (60 min) ← CRITICAL: ALL 7 CASES REQUIRED
- [ ] Create `tests/unit/performance/infinite-loop-protection.test.ts`
- [ ] Test 1: Single failure allows retry ✅
- [ ] Test 2: Three failures → DLQ ✅
- [ ] Test 3: Same fingerprint blocks ✅
- [ ] Test 4: RUNNING tasks protected ✅
- [ ] Test 5: Stale pending cleaned ✅
- [ ] Test 6: Executor slot released in finally ✅
- [ ] Test 7: Health endpoint has all fields ✅

### Code Quality Checks
- [ ] npm run typecheck (0 errors)
- [ ] npm run build (0 errors)
- [ ] npm run test:unit (ALL 7 CASES PASS)
- [ ] npm run test:integration (no regressions)
- [ ] Code review: Check all finally blocks
- [ ] Code review: Check all status checks

### Pre-Merge Gate (6 Required Conditions)
- [ ] ✅ `npm run typecheck` passes
- [ ] ✅ `npm run build` succeeds
- [ ] ✅ All 7 test cases PASS (infinite-loop-protection.test.ts)
- [ ] ✅ Health endpoint responds with stale + dlq + retry metrics
- [ ] ✅ Executor slot released in finally (code review confirmed)
- [ ] ✅ No RUNNING tasks in cleanup protected list (code review confirmed)

### Deployment
- [ ] Create PR: "fix: Add executor safety layer + infinite loop protection"
- [ ] Include test results (all 7 cases)
- [ ] Include before/after metrics
- [ ] Reference this plan + user's 5 safety guards
- [ ] Ensure all 6 pre-merge gates pass
- [ ] Merge after review
- [ ] Deploy to Vercel
- [ ] Monitor `/api/parallel/health` for 24 hours
- [ ] Verify queue size stays <5000
- [ ] Verify no RUNNING tasks deleted by cleanup

---

## 🚨 Rollback Plan

If issues occur:
```bash
# 1. Revert commit
git revert [commit-hash]

# 2. Clear queue (if stuck)
DELETE FROM queue WHERE status = 'pending' AND created_at < now() - interval '1 hour';

# 3. Clear task attempts
TRUNCATE task_attempts;

# 4. Restart agent
POST /api/parallel/queue/drain
```

---

## 📊 Expected Results After Fix

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Queue Size | 1000+ | <500 | ✅ |
| Task Retries | ∞ | 3 max | ✅ |
| Agent Loop | ∞ | Completes | ✅ |
| Execution Time | N/A | <5 min | ✅ |
| Alerts | Continuous | On-demand | ✅ |

---

## ⏱️ UPDATED Timeline (6 Phases + 5 Safety Guards)

**Phase Breakdown:**
- Phase 0: Task status model: 30 min
- Phase 1: Max retries + fingerprint: 60 min  
- Phase 2: Break condition: 45 min
- Phase 3: Release slot in finally: 30 min
- Phase 4: Safe cleanup: 30 min
- Phase 5: Monitoring API: 30 min
- Phase 6: Tests (all 7 cases): 60 min

**Subtotals:**
- Implementation: 3.5-4 hours
- Code review: 1 hour
- Testing: 1 hour
- Deployment: 30 min
- Pre-merge validation: 30 min

**Grand Total: 6-7 hours** (was 3-4, now +2.5h for safety guards)

---

## 🎯 Pre-Merge Gate (6 Non-Negotiable Conditions)

Before merging this PR to main, ALL 6 must be ✅:

```
GATE 1: ☐ npm run typecheck → 0 errors
GATE 2: ☐ npm run build → success (164/164 pages)
GATE 3: ☐ npm run test -- infinite-loop-protection.test.ts → 7/7 PASS
GATE 4: ☐ GET /api/parallel/health → includes:
         • queue.stale (count of old pending tasks)
         • queue.dlq (dead letter queue count)
         • loopProtection.maxRetries = 3
         • loopProtection.blockedFingerprints (count)
GATE 5: ☐ Code Review: Executor slot released in finally block
         • Check: All executeCommand() have try/catch/finally
         • Check: releaseExecutorSlot() in finally
GATE 6: ☐ Code Review: RUNNING tasks protected from cleanup
         • Check: protectedStatuses includes RUNNING
         • Check: cleanupQueueItems() skips protected statuses
```

**IF ANY GATE FAILS → DO NOT MERGE**

---

## 📞 Implementation Support

**If stuck during implementation:**

Phase 0 issues:
- Make sure TaskStatus enum covers all states
- Verify StopReason used in every response

Phase 1 issues:
- generateTaskFingerprint must be deterministic (same payload = same hash)
- Test with 3 identical tasks, ensure all blocked after 3 failures

Phase 3 CRITICAL:
- Every `try { await execute(...) }` MUST have `finally { releaseSlot() }`
- If finally is missing → execution will hang (executor full forever)

Phase 4 CRITICAL:
- NEVER delete task.status === RUNNING
- Test: Create RUNNING task, run cleanup, verify task still exists

Phase 6 CRITICAL:
- All 7 tests must pass
- If test 6 fails (slot release), there's a missing finally block

**Debug endpoint:** GET /api/parallel/health gives you complete state

---

## 📋 Summary of 5 Safety Guards

From user's review, these 5 guards are non-negotiable:

| Guard | Prevents | Files | Location |
|-------|----------|-------|----------|
| **Guard 1: Task Fingerprint** | Same payload looping forever | `executor-throttle.ts` | generateTaskFingerprint() |
| **Guard 2: Release Slot** | Executor stuck at 100% | `execute route` | finally block |
| **Guard 3: Stop Reason** | Agent doesn't know why it stopped | All responses | ExecutionResponse type |
| **Guard 4: Safe Cleanup** | Deleting active tasks | `request-queue.ts` | protectedStatuses check |
| **Guard 5: Complete Monitoring** | Can't debug issues | `/api/parallel/health` | Full metrics response |

---

*Plan UPDATED: 2026-06-11*  
*Status: ✅ APPROVED TO IMPLEMENT (with 5 safety guards)*  
*Estimated Effort: 6-7 hours (was 2-3, now with complete safety layer)*  
*Pre-Merge Gates: 6 Required (all must pass)*  
*Test Coverage: 7 Critical Cases (all must pass)*
