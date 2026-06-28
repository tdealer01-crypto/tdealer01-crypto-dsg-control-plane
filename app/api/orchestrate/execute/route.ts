import { NextRequest, NextResponse } from 'next/server';
import { requireInternalService } from '@/lib/auth/internal-service';
import { logApiError } from '@/lib/security/api-error';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface SubtaskInput {
  data: any;
  policy_id?: string;
}

interface SubagentDefinition {
  agent_id: string;
  api_key?: string;
  subtask: SubtaskInput;
}

interface OrchestrateRequest {
  task_name: string;
  task_description?: string;
  subagents: SubagentDefinition[];
  timeout_per_agent_ms?: number;
  execution_mode?: 'parallel' | 'sequential';
}

/**
 * POST /api/orchestrate/execute
 *
 * Orchestrate parallel multi-agent execution
 *
 * Request body:
 * {
 *   task_name: string,
 *   subagents: [
 *     {
 *       agent_id: uuid,
 *       api_key?: string (fallback if agent has token),
 *       subtask: { data: {...}, policy_id?: string }
 *     }
 *   ],
 *   timeout_per_agent_ms?: 30000,
 *   execution_mode?: 'parallel' | 'sequential'
 * }
 */
export async function POST(request: NextRequest) {
  const internalAccess = requireInternalService(request);
  if (!internalAccess.ok) {
    const failure = internalAccess as any;
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }

  const body: OrchestrateRequest = await request.json().catch(() => ({}));
  const {
    task_name,
    task_description,
    subagents = [],
    timeout_per_agent_ms = 30000,
    execution_mode = 'parallel',
  } = body;

  // Validate
  if (!task_name || typeof task_name !== 'string') {
    return NextResponse.json(
      { error: 'task_name is required' },
      { status: 400 }
    );
  }

  if (!Array.isArray(subagents) || subagents.length === 0) {
    return NextResponse.json(
      { error: 'subagents array is required (min 1)' },
      { status: 400 }
    );
  }

  if (subagents.length > 100) {
    return NextResponse.json(
      { error: 'Maximum 100 subagents per orchestration' },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const startTime = Date.now();

  try {
    // Check quota before executing
    const { data: orgQuota } = await (admin
      .from('org_quotas' as any)
      .select('monthly_limit, used_this_month')
      .eq('org_id', internalAccess.orgId)
      .maybeSingle() as any);

    const quotaCost = subagents.length;
    const usedQuota = (orgQuota?.used_this_month || 0) + quotaCost;
    const monthlyLimit = orgQuota?.monthly_limit || 100000;

    if (usedQuota > monthlyLimit) {
      return NextResponse.json(
        {
          error: 'Organization quota exceeded',
          details: {
            monthly_limit: monthlyLimit,
            current_usage: usedQuota,
            requested_cost: quotaCost,
          },
        },
        { status: 429 }
      );
    }

    // Execute subagents
    const executionResults = await executeSubagents(
      subagents,
      internalAccess.orgId,
      timeout_per_agent_ms,
      execution_mode,
      admin
    );

    const endTime = Date.now();
    const successCount = executionResults.filter((r) => r.status === 'success').length;
    const failureCount = executionResults.filter((r) => r.status === 'error').length;

    // Record orchestration in audit trail
    try {
      await (admin
        .from('orchestration_executions' as any)
        .insert({
          orchestrator_agent_id: internalAccess.agentId,
          org_id: internalAccess.orgId,
          task_name,
          task_description,
          total_subagents: subagents.length,
          subagent_ids: subagents.map((s) => s.agent_id),
          execution_mode,
          successful_count: successCount,
          failed_count: failureCount,
          started_at: new Date(startTime).toISOString(),
          completed_at: new Date(endTime).toISOString(),
          total_duration_ms: endTime - startTime,
        }) as any);
    } catch (auditErr) {
      console.warn('Failed to record orchestration audit:', auditErr);
      // Don't fail the request if audit fails
    }

    return NextResponse.json({
      success: successCount === subagents.length,
      orchestrator_agent_id: internalAccess.agentId,
      org_id: internalAccess.orgId,
      task_name,
      execution_stats: {
        total_subagents: subagents.length,
        successful: successCount,
        failed: failureCount,
        total_duration_ms: endTime - startTime,
      },
      execution_mode,
      results: executionResults,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Orchestration error:', err);
    return NextResponse.json(
      { error: 'Orchestration failed' },
      { status: 500 }
    );
  }
}

/**
 * Execute subagents in parallel or sequential mode
 */
async function executeSubagents(
  subagents: SubagentDefinition[],
  orgId: string,
  timeoutMs: number,
  executionMode: string,
  admin: ReturnType<typeof getSupabaseAdmin>
): Promise<any[]> {
  const executeOne = async (subagent: SubagentDefinition, index: number) => {
    try {
      // Get agent info + API key if needed
      const { data: agentRecord } = await (admin
        .from('agents' as any)
        .select('id, name, api_key_hash, status, monthly_limit')
        .eq('org_id', orgId)
        .eq('id', subagent.agent_id)
        .maybeSingle() as any);

      if (!agentRecord) {
        return {
          agent_id: subagent.agent_id,
          status: 'error',
          error: 'Agent not found or inactive',
          result: null,
        };
      }

      if (agentRecord.status !== 'active') {
        return {
          agent_id: subagent.agent_id,
          status: 'error',
          error: `Agent is ${agentRecord.status}`,
          result: null,
        };
      }

      // Call agent's /api/execute endpoint with INTERNAL_SERVICE_TOKEN
      const internalToken = process.env.INTERNAL_SERVICE_TOKEN || '';
      if (!internalToken) {
        throw new Error('INTERNAL_SERVICE_TOKEN not configured');
      }

      const agentExecuteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/execute`;

      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(agentExecuteUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${internalToken}`,
            'x-org-id': orgId,
            'x-agent-id': subagent.agent_id,
            'x-internal-service': 'orchestrator',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            intent: subagent.subtask.data,
            policy_version: subagent.subtask.policy_id,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutHandle);

        const resultData = await response.json();

        return {
          agent_id: subagent.agent_id,
          status: response.ok ? 'success' : 'error',
          status_code: response.status,
          result: resultData,
          duration_ms: Date.now(),
        };
      } catch (err) {
        clearTimeout(timeoutHandle);
        if ((err as any).name === 'AbortError') {
          return {
            agent_id: subagent.agent_id,
            status: 'error',
            error: `Timeout after ${timeoutMs}ms`,
            result: null,
          };
        }
        throw err;
      }
    } catch (err) {
      logApiError('api/orchestrate/execute', err, { agent_id: subagent.agent_id });
      return {
        agent_id: subagent.agent_id,
        status: 'error',
        error: 'subagent_execution_failed',
        result: null,
      };
    }
  };

  if (executionMode === 'sequential') {
    const results = [];
    for (let i = 0; i < subagents.length; i++) {
      results.push(await executeOne(subagents[i], i));
    }
    return results;
  } else {
    // Parallel (default)
    return Promise.all(subagents.map((s, i) => executeOne(s, i)));
  }
}

/**
 * GET /api/orchestrate/execute?orchestration_id=...
 * Get status of a previous orchestration
 */
export async function GET(request: NextRequest) {
  const internalAccess = requireInternalService(request);
  if (!internalAccess.ok) {
    const failure = internalAccess as any;
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }

  const orchestrationId = request.nextUrl.searchParams.get('orchestration_id');
  if (!orchestrationId) {
    return NextResponse.json(
      { error: 'orchestration_id query parameter is required' },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  try {
    const { data: orchestration } = await (admin
      .from('orchestration_executions' as any)
      .select('*')
      .eq('org_id', internalAccess.orgId)
      .eq('id', orchestrationId)
      .maybeSingle() as any);

    if (!orchestration) {
      return NextResponse.json(
        { error: 'Orchestration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      orchestration: orchestration,
    });
  } catch (err) {
    console.error('Get orchestration error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch orchestration status' },
      { status: 500 }
    );
  }
}
