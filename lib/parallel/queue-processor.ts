/**
 * PHASE 2 Agent A: Async Queue Processor
 * Main loop that processes requests from the priority queue
 *
 * Flow:
 * 1. Dequeue request from RequestQueue
 * 2. Get/spin up SimulationEnvironment for agent
 * 3. Lookup manifest via Harmony Engine (cache first)
 * 4. On miss: fetch from Supabase
 * 5. Verify command against manifest
 * 6. If ALLOW: check executor capacity, dispatch to executors
 * 7. If BLOCK: audit and skip
 * 8. Audit all decisions via AuditBatchWriter
 *
 * Performance targets:
 * - p50 latency: <500ms (cache hit + executor)
 * - p99 latency: <2s (embedding match + queueing)
 * - Cache hit rate: >80%
 */

import { randomUUID } from 'crypto';
import type { QueuedRequest } from '@/lib/performance/request-queue';
import { requestQueue } from '@/lib/performance/request-queue';
import { harmonyEngine } from '@/lib/parallel/harmony-engine';
import {
  getOrCreateSimulationEnvironment,
  cacheManifest,
} from '@/lib/parallel/parallel-simulation-orchestrator';
import { executorThrottle } from '@/lib/performance/executor-throttle';
import { auditBatchWriter } from '@/lib/performance/audit-batch-writer';
import type { SafeDomCommand } from '@/lib/dsg/safe-dom/types';
import { getManifestFromDatabase } from '@/lib/parallel/manifest-db-helper';

// Performance monitoring
let processedCount = 0;
let errorCount = 0;
let blockCount = 0;
let allowCount = 0;

/**
 * Get processor statistics
 */
export function getProcessorStats() {
  return {
    processed: processedCount,
    allowed: allowCount,
    blocked: blockCount,
    errors: errorCount,
  };
}

/**
 * Main async processor loop
 * Runs continuously, processing requests from the queue
 *
 * Note: In production, this should be started once at app startup
 * and kept running in the background.
 */
export async function processQueue(): Promise<void> {
  console.log('Starting parallel queue processor...');

  for await (const request of requestQueue.processQueueAsync()) {
    try {
      await processRequest(request);
    } catch (error) {
      console.error(`Queue processor error for request ${request.id}:`, error);
      errorCount++;

      // Re-queue failed request with bumped priority
      const requeuedId = requestQueue.requeue(request);
      if (requeuedId) {
        console.log(`Request ${request.id} re-queued as ${requeuedId}`);
      } else {
        console.warn(`Request ${request.id} failed and discarded (too many retries)`);
      }
    }
  }
}

/**
 * Process a single request through the full pipeline
 */
async function processRequest(request: QueuedRequest): Promise<void> {
  const t0 = performance.now();
  const requestId = request.id;
  const { agentId, delegationId, command } = request;

  // Step 1: Get or create simulation environment
  const env = getOrCreateSimulationEnvironment(agentId);

  // Step 2: Try harmony engine (manifest cache)
  const harmonyResult = harmonyEngine.findBestMatch(command);
  let manifest = harmonyResult.manifest;

  // Step 3: On manifest miss, fetch from database
  if (!manifest) {
    manifest = await getManifestFromDatabase(command.frameId, command.elementId);

    if (manifest) {
      // Cache the result for future lookups and harmony engine
      const manifestKey = `${command.frameId}:${command.elementId}`;
      cacheManifest(env, manifestKey, manifest);
      harmonyEngine.addToIndex(command, manifest, delegationId);
    }
  }

  // Step 4: Simple allow/block decision based on manifest availability
  // In production, this would call verifySafeDomCommand with detailed checks
  let decision = 'ALLOW';
  let reason = 'Verified and ready for execution';

  if (!manifest || manifest.length === 0) {
    decision = 'BLOCK';
    reason = 'No manifest found for element';
  }

  // Step 5: If BLOCK, audit and exit
  if (decision === 'BLOCK') {
    blockCount++;
    const latency = performance.now() - t0;

    auditBatchWriter.enqueue({
      agentId,
      delegationId,
      command: {
        type: command.operation,
        args: {
          frameId: command.frameId,
          elementId: command.elementId,
          value: command.value,
          key: command.key,
        },
      },
      decision: 'BLOCK',
      reason,
      harmonySource: harmonyResult.source,
      executorType: inferExecutorType(command),
      timestamp: Date.now(),
    });

    console.log(`Request ${requestId}: BLOCK - ${reason}`);
    return;
  }

  // Step 6: Check executor capacity
  const executorType = inferExecutorType(command);
  const hasCapacity = checkExecutorCapacity(executorType, agentId);

  if (!hasCapacity) {
    // Re-queue with same priority if no capacity
    console.log(`Request ${requestId}: No executor capacity, re-queueing`);
    requestQueue.requeue(request, request.priority);
    return;
  }

  // Step 7: In Phase 2, we skip actual executor dispatch
  // In production, this would call distributeCommandToParallelExecutors(env, command)
  const execSuccess = true;

  // Step 8: Audit the result
  allowCount++;
  const latency = performance.now() - t0;

  auditBatchWriter.enqueue({
    agentId,
    delegationId,
    command: {
      type: command.operation,
      args: {
        frameId: command.frameId,
        elementId: command.elementId,
        value: command.value,
        key: command.key,
      },
    },
    decision: 'ALLOW',
    reason: 'Queued for execution',
    harmonySource: harmonyResult.source,
    executorType,
    timestamp: Date.now(),
  });

  processedCount++;

  if (latency > 500) {
    console.warn(`Request ${requestId}: slow processing (${latency}ms)`);
  } else {
    console.log(`Request ${requestId}: processed in ${latency.toFixed(0)}ms`);
  }
}

/**
 * Infer executor type from SafeDomCommand
 * In a real implementation, this would be more sophisticated
 */
function inferExecutorType(command: SafeDomCommand): string {
  // For now, use operation type as proxy
  // In production, would look at command context/metadata
  switch (command.operation) {
    case 'click':
    case 'type':
      return 'browserbase';
    case 'scroll':
      return 'virtual-pc';
    case 'press':
      return 'terminal';
    default:
      return 'browserbase';
  }
}

/**
 * Check if executor has capacity to accept new task
 * Simplified version for Phase 2
 */
function checkExecutorCapacity(executorType: string, orgId: string): boolean {
  // Phase 2: Simplified check using executor throttle
  // In production: would check actual capacity registry

  try {
    const capacity = executorThrottle.getCapacityStatus();
    const executorKey = executorType as
      | 'virtual-pc'
      | 'browserbase'
      | 'terminal'
      | 'deploy';

    if (capacity[executorKey]) {
      const utilization = capacity[executorKey].utilization;
      // Block if over 95% capacity
      return utilization < 0.95;
    }

    return true; // Default to allowing if we can't determine capacity
  } catch {
    return true; // Fail open if we can't check
  }
}

/**
 * Start the queue processor in the background
 * Call this once at app startup
 */
export function startQueueProcessor(): void {
  // Start processing asynchronously
  processQueue().catch((err) => {
    console.error('Queue processor crashed:', err);
    // In production, would restart or alert
  });

  console.log('Queue processor started');
}
