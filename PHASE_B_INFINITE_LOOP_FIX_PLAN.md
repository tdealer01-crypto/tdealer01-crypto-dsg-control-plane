# Phase B Infinite Loop Fix Plan

**Issue:** Agent continuously re-executing same tasks (System readiness → List agents loop)  
**Root Cause:** Missing max retries + missing break condition + queue not cleaning up  
**Priority:** HIGH (affects production)  
**Effort:** 2-3 hours  

---

## 🎯 Implementation Plan

### Phase 1: Add Max Retries Safety Guard (1 hour)

#### File 1: `lib/performance/executor-throttle.ts`

**Add retry tracking:**
```typescript
// ADD after line 30 (capacity limits definition)

interface ExecutionAttempt {
  taskId: string;
  commandId: string;
  retryCount: number;
  maxRetries: number;
  firstAttemptTime: Date;
  lastAttemptTime: Date;
  lastError?: string;
}

const TASK_RETRY_CONFIG = {
  maxRetries: 3,              // ← Max 3 attempts
  retryBackoffMs: 1000,       // ← Wait 1s between retries
  taskTimeoutMs: 30000,       // ← Max 30s per task
  maxTimeoutMs: 300000,       // ← Max 5 min total
};

const taskAttempts = new Map<string, ExecutionAttempt>();

export function canRetryTask(taskId: string): boolean {
  const attempt = taskAttempts.get(taskId);
  if (!attempt) return true;
  
  // Check max retries
  if (attempt.retryCount >= attempt.maxRetries) {
    console.warn(`Task ${taskId} exceeded max retries (${attempt.maxRetries})`);
    return false;
  }
  
  // Check total time elapsed
  const elapsedMs = Date.now() - attempt.firstAttemptTime.getTime();
  if (elapsedMs > TASK_RETRY_CONFIG.maxTimeoutMs) {
    console.warn(`Task ${taskId} exceeded max time (${elapsedMs}ms)`);
    return false;
  }
  
  return true;
}

export function recordTaskAttempt(
  taskId: string,
  executor: string,
  error?: string
): void {
  const existing = taskAttempts.get(taskId);
  
  if (existing) {
    existing.retryCount++;
    existing.lastAttemptTime = new Date();
    existing.lastError = error;
  } else {
    taskAttempts.set(taskId, {
      taskId,
      commandId: executor,
      retryCount: 0,
      maxRetries: TASK_RETRY_CONFIG.maxRetries,
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

export function clearTaskAttempt(taskId: string): void {
  taskAttempts.delete(taskId);
}

export function getTaskAttemptStats(): Record<string, ExecutionAttempt> {
  return Object.fromEntries(taskAttempts);
}
```

**Modify executeCommand function:**
```typescript
// MODIFY around line 100 (executeCommand function)

export async function executeCommand(
  command: SafeDomCommand,
  executor: string
): Promise<ExecutionResult> {
  const taskId = `${executor}:${command.frameId}:${command.elementId}`;
  
  // Check if can retry
  if (!canRetryTask(taskId)) {
    return {
      success: false,
      reason: 'max_retries_exceeded',
      taskId,
      attempts: getTaskAttemptStats()[taskId],
    };
  }
  
  try {
    // Check capacity before executing
    const canExecute = await checkCapacity(executor);
    if (!canExecute) {
      recordTaskAttempt(taskId, executor, 'capacity_limit');
      return {
        success: false,
        reason: 'executor_at_capacity',
        taskId,
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
    };
  } catch (error) {
    recordTaskAttempt(taskId, executor, String(error));
    
    // Determine if retryable error
    const isRetryable = isRetryableError(error);
    
    return {
      success: false,
      reason: isRetryable ? 'retryable_error' : 'fatal_error',
      taskId,
      attempts: getTaskAttemptStats()[taskId],
      error: String(error),
      canRetry: isRetryable && canRetryTask(taskId),
    };
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
    timestamp: new Date(),
  };
  
  // Check all queue items
  const allItems = getQueueState().items;
  
  allItems.forEach((item: QueueItem, index: number) => {
    const age = now - item.createdAt.getTime();
    let shouldRemove = false;
    let shouldMoveToDLQ = false;
    
    // Completed items older than TTL
    if (item.status === 'completed' && age > CLEANUP_CONFIG.completedItemTTL) {
      shouldRemove = true;
    }
    
    // Failed items that exceeded retry limit
    if (item.status === 'failed' && item.attempts >= 3) {
      if (age > CLEANUP_CONFIG.failedItemTTL) {
        shouldMoveToDLQ = true;
      }
    }
    
    // Stale pending items (no progress in 15 min)
    if (item.status === 'pending' && age > CLEANUP_CONFIG.stalePendingTTL) {
      console.warn(
        `Queue item ${item.id} is stale (pending for ${age}ms), moving to DLQ`
      );
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
  if (stats.removed > 0 || stats.moved_to_dead_letter > 0) {
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
        executing: queueState.items.filter(i => i.status === 'executing').length,
        completed: queueState.items.filter(i => i.status === 'completed').length,
        failed: queueState.items.filter(i => i.status === 'failed').length,
      },
      oldestItem: queueState.items[0]?.createdAt,
      oldestItemAgeMs: queueState.items[0]
        ? Date.now() - queueState.items[0].createdAt.getTime()
        : 0,
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
    agent: agentStats ? {
      id: agentId,
      isExecuting: agentStats.isExecuting,
      completedTasks: agentStats.completedTasks.size,
      failedTasks: agentStats.failedTasks.size,
      elapsedMs: Date.now() - agentStats.startTime.getTime(),
      currentTask: agentStats.currentTaskId,
    } : null,
    health: {
      ok: queueState.items.length < 5000,
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
import { describe, it, expect, beforeEach } from 'vitest';
import {
  canRetryTask,
  recordTaskAttempt,
  clearTaskAttempt,
  getTaskAttemptStats,
} from '@/lib/performance/executor-throttle';
import {
  shouldContinueExecution,
  markTaskCompleted,
  markTaskFailed,
  resetAgentState,
  getAgentState,
} from '@/lib/spine/execute';

describe('Infinite Loop Protection', () => {
  beforeEach(() => {
    resetAgentState('test-agent');
  });
  
  describe('Max Retries', () => {
    it('should allow retries up to maxRetries limit', () => {
      const taskId = 'test-task-1';
      
      expect(canRetryTask(taskId)).toBe(true);
      recordTaskAttempt(taskId, 'deploy', undefined);
      expect(canRetryTask(taskId)).toBe(true);
      
      recordTaskAttempt(taskId, 'deploy', 'timeout');
      expect(canRetryTask(taskId)).toBe(true);
      
      recordTaskAttempt(taskId, 'deploy', 'capacity');
      // After 3 retries, should fail
      expect(canRetryTask(taskId)).toBe(false);
    });
    
    it('should clear task attempts on success', () => {
      const taskId = 'test-task-2';
      recordTaskAttempt(taskId, 'deploy', 'error');
      expect(Object.keys(getTaskAttemptStats()).length).toBe(1);
      
      clearTaskAttempt(taskId);
      expect(Object.keys(getTaskAttemptStats()).length).toBe(0);
    });
  });
  
  describe('Agent Execution Break Condition', () => {
    it('should stop execution when queue is empty', () => {
      const agentId = 'test-agent';
      expect(shouldContinueExecution(agentId, 0)).toBe(false);
    });
    
    it('should continue with items in queue', () => {
      const agentId = 'test-agent';
      expect(shouldContinueExecution(agentId, 5)).toBe(true);
    });
    
    it('should stop after max failures', () => {
      const agentId = 'test-agent';
      const state = getAgentState(agentId);
      
      // Add 10 failures
      for (let i = 0; i < 10; i++) {
        markTaskFailed(agentId, `task-${i}`);
      }
      
      expect(shouldContinueExecution(agentId, 100)).toBe(false);
    });
    
    it('should track completed vs failed tasks', () => {
      const agentId = 'test-agent';
      
      markTaskCompleted(agentId, 'task-1');
      markTaskCompleted(agentId, 'task-2');
      markTaskFailed(agentId, 'task-3');
      
      const state = getAgentState(agentId);
      expect(state.completedTasks.size).toBe(2);
      expect(state.failedTasks.size).toBe(1);
    });
  });
});
```

---

## 📋 Implementation Checklist

### Before Coding
- [ ] Create feature branch: `fix/infinite-loop-protection`
- [ ] Review current `executor-throttle.ts` lines 1-100
- [ ] Review `spine/execute.ts` structure
- [ ] Review `request-queue.ts` implementation

### Implementation
- [ ] Phase 1: Add max retries (45 min)
  - [ ] Add ExecutionAttempt interface
  - [ ] Add canRetryTask function
  - [ ] Add recordTaskAttempt function
  - [ ] Modify executeCommand function
  - [ ] Test max retries locally

- [ ] Phase 2: Add break condition (45 min)
  - [ ] Add AgentExecutionState interface
  - [ ] Add shouldContinueExecution function
  - [ ] Modify spine execute loop
  - [ ] Test break condition locally

- [ ] Phase 3: Add cleanup (30 min)
  - [ ] Add cleanup interval logic
  - [ ] Add moveItemToDeadLetterQueue
  - [ ] Test queue cleanup

- [ ] Phase 4: Add monitoring (30 min)
  - [ ] Create /api/parallel/health route
  - [ ] Add issue detection
  - [ ] Test endpoint

- [ ] Phase 5: Add tests (45 min)
  - [ ] Write retry limit tests
  - [ ] Write break condition tests
  - [ ] Write cleanup tests

### Testing
- [ ] Unit tests pass: `npm run test:unit`
- [ ] Integration tests pass: `npm run test:integration`
- [ ] Build passes: `npm run build`
- [ ] TypeCheck passes: `npm run typecheck`
- [ ] Manual test with dev server

### Verification
- [ ] Queue never grows beyond 5000
- [ ] Tasks max out at 3 retries
- [ ] Agent execution completes (doesn't infinite loop)
- [ ] Completed items cleaned up
- [ ] Failed items moved to DLQ
- [ ] Monitoring endpoint responds

### Deployment
- [ ] Create PR: "fix: Add infinite loop protection"
- [ ] Include test results
- [ ] Reference this plan in PR body
- [ ] Merge after review
- [ ] Deploy to Vercel
- [ ] Monitor /api/parallel/health

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

## 🎯 Timeline

- **Today:** Implement + Test (3 hours)
- **Review:** PR review (1 hour)
- **Deploy:** Merge + Deploy (30 min)
- **Monitor:** Watch metrics (24 hours)

---

## 📞 Support

If issues during implementation:
1. Check Phase 1 max retries first (simplest)
2. Verify break condition in agent loop
3. Ensure queue cleanup is running
4. Check monitoring endpoint for issues

**Contact:** Check Phase B implementation docs for architecture details

---

*Plan created: 2026-06-11*  
*Status: Ready to implement*  
*Estimated effort: 2-3 hours*
