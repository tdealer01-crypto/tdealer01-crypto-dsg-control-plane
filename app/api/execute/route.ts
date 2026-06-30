// ERROR_HANDLER_EXEMPT
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { resolveAgentFromApiKey } from '@/lib/agent-auth';
import { executeSpineIntent, issueSpineIntent } from '@/lib/spine/engine';
import { normalizeSpinePayload } from '@/lib/spine/request';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '@/lib/security/rate-limit';
import { handleApiError } from '@/lib/security/api-error';
import { checkQuota, incrementQuota } from '@/lib/usage/quota';
import { meterExecution } from '@/lib/billing/metered';
import { verifySafeDomIntentOrPass } from '@/lib/spine/verify-safe-dom-intent';
import { StopReason } from '@/lib/types/task';

export const dynamic = 'force-dynamic';

const EXECUTE_RATE_LIMIT = 60;
const EXECUTE_RATE_WINDOW_MS = 60 * 1000;

interface AgentExecutionState {
  agentId: string;
  isExecuting: boolean;
  completedTasks: Set<string>;
  failedTasks: Set<string>;
  startTime: number;
  maxDuration: number;
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
      maxDuration: 5 * 60 * 1000,
    });
  }
  return agentExecutionStates.get(agentId)!;
}

function shouldContinueExecution(
  agentId: string,
  queueSize: number,
): { should: boolean; stopReason: StopReason } {
  const state = getOrCreateExecutionState(agentId);

  if (queueSize === 0) {
    return { should: false, stopReason: StopReason.QUEUE_EMPTY };
  }
  if (state.failedTasks.size >= 10) {
    return { should: false, stopReason: StopReason.TOO_MANY_FAILURES };
  }
  const elapsed = Date.now() - state.startTime;
  if (elapsed > state.maxDuration) {
    return { should: false, stopReason: StopReason.EXECUTION_TIMEOUT };
  }
  return { should: true, stopReason: StopReason.NONE };
}

function markTaskCompleted(agentId: string, taskId: string): void {
  getOrCreateExecutionState(agentId).completedTasks.add(taskId);
}

function markTaskFailed(agentId: string, taskId: string): void {
  getOrCreateExecutionState(agentId).failedTasks.add(taskId);
}

function jsonWithHeaders(
  request: Request,
  body: Record<string, unknown>,
  status: number,
  extraHeaders?: HeadersInit,
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
      buildRateLimitHeaders(rateLimit, EXECUTE_RATE_LIMIT),
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: responseHeaders },
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
        responseHeaders,
      );
    }

    const sessionId = String(payload.context.sessionId || payload.input.sessionId || '');
    const safeDomVerification = await verifySafeDomIntentOrPass(payload, sessionId);
    if (safeDomVerification) {
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
          responseHeaders,
        );
      }
      if (safeDomVerification.decision === 'REVIEW') {
        payload.context.safeDomReview = safeDomVerification.reason;
      }
    }

    const executionState = getOrCreateExecutionState(agentId);
    if (!executionState.isExecuting) {
      executionState.isExecuting = true;
      executionState.startTime = Date.now();
      executionState.completedTasks.clear();
      executionState.failedTasks.clear();
    }

    const queueSize = 1;
    const continueCheck = shouldContinueExecution(agentId, queueSize);
    const stopReason = continueCheck.stopReason;

    let result = await executeSpineIntent({ orgId, apiKey, payload });

    if (
      !result.ok &&
      result.status === 409 &&
      result.body?.error === 'No pending runtime intent for request'
    ) {
      const issued = await issueSpineIntent({ orgId, apiKey, payload });

      if (!issued.ok) {
        return NextResponse.json(
          { ...issued.body, stop_reason: stopReason },
          { status: issued.status, headers: responseHeaders },
        );
      }

      result = await executeSpineIntent({ orgId, apiKey, payload });
    }

    const taskId = String((result.body as Record<string, unknown>)?.task_id ?? randomUUID());
    if (result.status >= 200 && result.status < 300) {
      markTaskCompleted(agentId, taskId);
    } else if (result.status >= 400) {
      markTaskFailed(agentId, taskId);
    }

    if (result.status >= 200 && result.status < 300) {
      void incrementQuota(orgId, agentId).catch((error) => {
        console.error('[api/execute] incrementQuota failed:', error);
      });
      const executionId =
        ((result.body as Record<string, unknown>)?.execution_id as string | undefined) ??
        randomUUID();
      void meterExecution(orgId, 1, executionId).catch((error) => {
        console.error('[api/execute] meterExecution failed:', error);
      });
    }

    const responseBody = {
      ...(result.body as Record<string, unknown>),
      stop_reason: stopReason,
    };

    return NextResponse.json(responseBody, {
      status: result.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return handleApiError('api/execute', error, {
      headers: responseHeaders ?? buildCorsHeaders(request),
    });
  }
}
