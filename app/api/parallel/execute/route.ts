/**
 * PHASE 2 Agent A: Request Ingestion Endpoint
 * POST /api/parallel/execute
 *
 * Accepts delegation requests and queues them for parallel processing.
 *
 * Request body:
 * {
 *   agentId: string;
 *   delegationId: string;
 *   command: SafeDomCommand;
 *   priority?: 1 | 2 | 3; // 1=CONFIRM, 2=AUDIT, 3=AUTO (default 3)
 * }
 *
 * Response:
 * {
 *   requestId: string;
 *   queuePosition: number;
 *   estimatedWaitMs: number;
 * }
 *
 * Error codes:
 * - 400: Invalid request (missing fields)
 * - 404: Delegation not found
 * - 503: Queue full (too many pending requests)
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import type { SafeDomCommand } from '@/lib/dsg/safe-dom/types';
import type { RequestPriority } from '@/lib/performance/request-queue';
import { requestQueue } from '@/lib/performance/request-queue';
import { getDelegationFromDatabase } from '@/lib/parallel/delegation-helper';
import { logApiError, internalErrorMessage } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

interface ExecuteRequestBody {
  agentId: string;
  delegationId: string;
  command: SafeDomCommand;
  priority?: RequestPriority;
}

/**
 * Validate that the request body has all required fields
 */
function validateRequestBody(body: unknown): body is ExecuteRequestBody {
  if (!body || typeof body !== 'object') return false;

  const b = body as Record<string, unknown>;
  return (
    typeof b.agentId === 'string' &&
    typeof b.delegationId === 'string' &&
    b.command !== undefined &&
    typeof (b.command as Record<string, unknown>).frameId === 'string' &&
    typeof (b.command as Record<string, unknown>).elementId === 'string' &&
    typeof (b.command as Record<string, unknown>).operation === 'string'
  );
}

/**
 * Estimate queue wait time based on priority and current queue state
 */
function estimateQueueWaitMs(priority: RequestPriority): number {
  const stats = requestQueue.getStats();

  // Rough estimation:
  // - Each request takes ~100ms (network + db) for fast path
  // - P1 requests ahead: process immediately
  // - P2 requests ahead: ~50ms each
  // - P3 requests ahead: ~100ms each
  const p1Count = stats.priorityDistribution.p1;
  const p2Count = stats.priorityDistribution.p2;
  const p3Count = stats.priorityDistribution.p3;

  let waitMs = 0;

  // Only count requests with higher priority
  if (priority === 3) {
    waitMs += p1Count * 50 + p2Count * 75;
  } else if (priority === 2) {
    waitMs += p1Count * 50;
  }
  // P1 doesn't wait for anyone

  return Math.min(waitMs, 5000); // Cap at 5 seconds
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate request structure
    if (!validateRequestBody(body)) {
      return NextResponse.json(
        {
          error: 'Missing or invalid required fields: agentId, delegationId, command',
        },
        { status: 400 }
      );
    }

    const { agentId, delegationId, command, priority = 3 } = body;

    // Validate priority
    if (![1, 2, 3].includes(priority)) {
      return NextResponse.json(
        { error: 'Priority must be 1, 2, or 3' },
        { status: 400 }
      );
    }

    // Check that delegation exists
    const delegation = await getDelegationFromDatabase(delegationId);
    if (!delegation) {
      return NextResponse.json(
        { error: 'Delegation not found' },
        { status: 404 }
      );
    }

    // Create queued request
    const enqueuedAt = Date.now();
    const deadline = enqueuedAt + 30_000; // 30-second timeout

    // Enqueue the request
    const requestId = requestQueue.enqueue({
      priority: priority as RequestPriority,
      agentId,
      delegationId,
      command,
      enqueuedAt,
      deadline,
    });

    if (!requestId) {
      // Queue is full
      return NextResponse.json(
        { error: 'Queue is full, cannot accept new requests' },
        { status: 503 }
      );
    }

    // Get current queue stats
    const stats = requestQueue.getStats();
    const estimatedWaitMs = estimateQueueWaitMs(priority as RequestPriority);

    return NextResponse.json(
      {
        requestId,
        queuePosition: stats.size,
        estimatedWaitMs,
      },
      { status: 200 }
    );
  } catch (error) {
    logApiError('api/parallel/execute', error);
    return NextResponse.json(
      { error: internalErrorMessage() },
      { status: 500 }
    );
  }
}
