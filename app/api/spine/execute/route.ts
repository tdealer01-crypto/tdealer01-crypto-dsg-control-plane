import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { resolveAgentFromApiKey } from '../../../../lib/agent-auth';
import { executeSpineIntent, issueSpineIntent } from '../../../../lib/spine/engine';
import { normalizeSpinePayload } from '../../../../lib/spine/request';
import { buildCorsHeaders, buildPreflightResponse } from '../../../../lib/security/cors';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { handleApiError } from '../../../../lib/security/api-error';
import { logQuotaConsumption } from '../../../../lib/database/quotas';
import { checkQuota, incrementQuota } from '../../../../lib/usage/quota';
import { fireWebhook } from '../../../../lib/webhooks/deliver';
import { meterExecution } from '../../../../lib/billing/metered';
import { verifySafeDomIntentOrPass } from '../../../../lib/spine/verify-safe-dom-intent';
import { StopReason } from '../../../../lib/types/task';
import { captureEvent } from '../../../../lib/telemetry/capture-event';

export const dynamic = 'force-dynamic';

const EXECUTE_RATE_LIMIT = 60;
const EXECUTE_RATE_WINDOW_MS = 60 * 1000;

/**
 * PHASE 2: Execution State and Break Conditions
 *
 * Tracks execution state per agent and enforces break conditions:
 * - Stop if queue empty
 * - Stop if 10+ failures
 * - Stop if elapsed > 5 minutes
 * - Return stop_reason in all responses
 */

interface AgentExecutionState {
  agentId: string;
  isExecuting: boolean;
  completedTasks: Set<string>;
  failedTasks: Set<string>;
  startTime: number;
  maxDuration: number; // 5 minutes = 5 * 60 * 1000 ms
}

const agentExecutionStates = new Map<string, AgentExecutionState>();

function getOrCreateExecutionState(agentId: string): AgentExecutionState {
  if (!agentExecutionStates.has(agentId)) {
    agentExecutionStates.set(agentId, {
      agentId,
      isExecuting: false,
      completedTasks: new Set(),
      failedTasks: new Set(),
      startTime: 0,
      maxDuration: 5 * 60 * 1000, // 5 minutes
    });
  }
  return agentExecutionStates.get(agentId)!;
}

function shouldContinueExecution(
  agentId: string,
  queueSize: number
): { should: boolean; stopReason: StopReason } {
  const state = getOrCreateExecutionState(agentId);

  // Check if queue is empty
  if (queueSize === 0) {
    return { should: false, stopReason: StopReason.QUEUE_EMPTY };
  }

  // Check if too many failures (10+)
  if (state.failedTasks.size >= 10) {
    return { should: false, stopReason: StopReason.TOO_MANY_FAILURES };
  }

  // Check if execution timeout exceeded (5 minutes)
  const elapsed = Date.now() - state.startTime;
  if (elapsed > state.maxDuration) {
    return { should: false, stopReason: StopReason.EXECUTION_TIMEOUT };
  }

  return { should: true, stopReason: StopReason.NONE };
}

function markTaskCompleted(agentId: string, taskId: string): void {
  const state = getOrCreateExecutionState(agentId);
  state.completedTasks.add(taskId);
}

function markTaskFailed(agentId: string, taskId: string): void {
  const state = getOrCreateExecutionState(agentId);
  state.failedTasks.add(taskId);
}

function jsonWithHeaders(
  request: Request,
  body: Record<string, unknown>,
  status: number,
  extraHeaders?: HeadersInit
) {
  return NextResponse.json(body, {
    status,
    headers: buildCorsHeaders(request, extraHeaders),
  });
}

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function OPTIONS(request: Request) {
  return buildPreflightResponse(request);
}

export async function POST(request: Request) {
  let responseHeaders: Headers | undefined;

  try {
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, 'spine-execute'),
      limit: EXECUTE_RATE_LIMIT,
      windowMs: EXECUTE_RATE_WINDOW_MS,
    });

    responseHeaders = buildCorsHeaders(
      request,
      buildRateLimitHeaders(rateLimit, EXECUTE_RATE_LIMIT)
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: responseHeaders }
      );
    }

    const apiKey = extractBearerToken(request);
    if (!apiKey) {
      return jsonWithHeaders(request, { error: 'Missing Bearer token' }, 401, responseHeaders);
    }

    const payload = normalizeSpinePayload(await request.json().catch(() => null));
    if (!payload.agentId) {
      return jsonWithHeaders(request, { error: 'agent_id is required' }, 400, responseHeaders);
    }

    const agent = await resolveAgentFromApiKey(payload.agentId, apiKey);
    if (!agent) {
      return jsonWithHeaders(request, { error: 'Invalid agent_id or API key' }, 401, responseHeaders);
    }

    if (agent.status !== 'active') {
      return jsonWithHeaders(request, { error: 'Agent is not active' }, 403, responseHeaders);
    }

    const orgId = String(agent.org_id);
    const agentId = String(agent.id);

    // Check if this is first execution for agent (before quota check)
    const { count: agentExecutions } = await (async () => {
      try {
        // Try to get execution count, but don't fail if unavailable
        const result = await (global as any).__supabaseExecutionCount?.(agentId);
        return { count: result?.count || 0 };
      } catch {
        return { count: 0 };
      }
    })();

    const isFirstExecution = (agentExecutions || 0) === 0;

    // Extract policyId and requestType from payload context/input
    const policyId = (payload.context.policy_id || payload.input.policy_id) as string | undefined;
    const requestType = (payload.context.request_type || payload.input.request_type || payload.action) as string;

    // Capture execution_submitted event
    await captureEvent('execution_submitted', {
      userId: agentId,
      organizationId: orgId,
      agentId,
    }, {
      organization_id: orgId,
      agent_id: agentId,
      execution_id: randomUUID(),
      policy_id: policyId || null,
      policy_version: 'v1',
      is_first_execution: isFirstExecution,
      request_type: requestType,
    });

    // Quota gate: check before executing (read-only, safe to run first)
    const quota = await checkQuota(orgId, agentId);
    if (!quota.allowed) {
      return jsonWithHeaders(
        request,
        {
          error: 'Monthly execution quota exceeded',
          used: quota.used,
          limit: quota.limit,
          upgrade_url: quota.upgradeUrl,
        },
        402,
        responseHeaders
      );
    }

    // Safe DOM verification (new)
    // Verify that Safe DOM commands only target exposed elements in the manifest
    const sessionId = String(payload.context.sessionId || payload.input.sessionId || '');
    const safeDomVerification = await verifySafeDomIntentOrPass(payload, sessionId);
    if (safeDomVerification) {
      // Safe DOM verification returned a result (either BLOCK or REVIEW)
      if (safeDomVerification.decision === 'BLOCK') {
        return jsonWithHeaders(
          request,
          {
            error: 'Safe DOM verification failed',
            reason: safeDomVerification.reason,
            element_id: safeDomVerification.elementId,
            decision: 'block',
          },
          403,
          responseHeaders
        );
      }
      // REVIEW decision falls through to normal gate/approval flow with verification metadata
      if (safeDomVerification.decision === 'REVIEW') {
        // Continue with execution but the pipeline will note the REVIEW status
        payload.context.safeDomReview = safeDomVerification.reason;
      }
    }

    // Initialize execution state on first call
    const executionState = getOrCreateExecutionState(agentId);
    if (!executionState.isExecuting) {
      executionState.isExecuting = true;
      executionState.startTime = Date.now();
      executionState.completedTasks.clear();
      executionState.failedTasks.clear();
    }

    // Check break conditions (Phase 2)
    const queueSize = 1; // Placeholder: in production, query actual queue size
    const continueCheck = shouldContinueExecution(agentId, queueSize);
    let stopReason = continueCheck.stopReason;

    let result = await executeSpineIntent({
      orgId,
      apiKey,
      payload,
    });

    if (
      !result.ok &&
      result.status === 409 &&
      result.body?.error === 'No pending runtime intent for request'
    ) {
      const issued = await issueSpineIntent({
        orgId,
        apiKey,
        payload,
      });

      if (!issued.ok) {
        return NextResponse.json(
          {
            ...issued.body,
            stop_reason: stopReason,
          },
          {
            status: issued.status,
            headers: responseHeaders,
          }
        );
      }

      result = await executeSpineIntent({
        orgId,
        apiKey,
        payload,
      });
    }

    // Track task outcome for Phase 2 break conditions
    const taskId = String((result.body as Record<string, unknown>)?.task_id ?? randomUUID());
    if (result.status >= 200 && result.status < 300) {
      markTaskCompleted(agentId, taskId);
    } else if (result.status >= 400) {
      markTaskFailed(agentId, taskId);
    }

    // Count executions only on success (2xx)
    if (result.status >= 200 && result.status < 300) {
      // Extract decision and metadata
      const executionId =
        ((result.body as Record<string, unknown>)?.execution_id as string | undefined) ??
        randomUUID();
      const decision = (result.body as Record<string, unknown>)?.decision as string || 'UNKNOWN';
      const decisionLatencyMs = Date.now() - (executionState?.startTime || Date.now());

      // Capture decision_made event
      await captureEvent('decision_made', {
        userId: agentId,
        organizationId: orgId,
        agentId,
      }, {
        organization_id: orgId,
        execution_id: executionId,
        decision,
        policy_id: policyId || null,
        policy_version: 'v1',
        decision_latency_ms: decisionLatencyMs,
        proof_hash: (result.body as Record<string, unknown>)?.proof_hash || null,
      });

      // Fire-and-forget side effects must not become unhandled rejections —
      // a rejected floating promise can take down the worker after the
      // response has already been returned.
      void incrementQuota(orgId, agentId).catch((error) => {
        console.error('[api/spine/execute] incrementQuota failed:', error);
      });
      void fireWebhook(orgId, 'execution.completed', {
        agent_id: agentId,
        decision: decision ?? null,
      }).catch((error) => {
        console.error('[api/spine/execute] fireWebhook failed:', error);
      });
      void meterExecution(orgId, 1, executionId).catch((error) => {
        console.error('[api/spine/execute] meterExecution failed:', error);
      });
      void logQuotaConsumption(orgId, 'api_execution', 1, {
        source: '/api/spine/execute',
        metadata: {
          agentId,
          executionId,
        },
      }).catch((error) => {
        console.error('[api/spine/execute] logQuotaConsumption failed:', error);
      });
    }

    // Add stop_reason to response (Phase 2)
    const responseBody = {
      ...(result.body as Record<string, unknown>),
      stop_reason: stopReason,
    };

    return NextResponse.json(responseBody, {
      status: result.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return handleApiError('api/spine/execute', error, {
      headers: responseHeaders ?? buildCorsHeaders(request),
    });
  }
}
