import { NextRequest, NextResponse } from 'next/server';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';
import { handleApiError } from '@/lib/security/api-error';
import { runVerifiedOptimizationPipeline } from '@/lib/dsg-one/verified-optimization-pipeline';
import type { Task, AgentCapacity } from '@/lib/dsg/multi-agent/types';

export const dynamic = 'force-dynamic';

type Body = {
  problemId?: unknown;
  tasks?: unknown;
  agentCapacities?: unknown;
  seed?: unknown;
  solverMode?: unknown;
  timeout?: unknown;
  exactProofMaxVariables?: unknown;
};

type DeniedAuth = { ok: false; error: string; status: 401 | 403 };

export async function POST(request: NextRequest) {
  const auth = await requireOrgPermission('org.execute');
  if (auth.ok === false) {
    const denied = auth as DeniedAuth;
    return NextResponse.json({ ok: false, error: denied.error }, { status: denied.status });
  }

  try {
    const body = (await request.json()) as Body;
    if (typeof body.problemId !== 'string' || !Array.isArray(body.tasks) || !Array.isArray(body.agentCapacities)) {
      return NextResponse.json(
        { ok: false, error: 'problemId, tasks, and agentCapacities are required' },
        { status: 400 },
      );
    }

    if (body.solverMode !== undefined && body.solverMode !== 'local' && body.solverMode !== 'live') {
      return NextResponse.json(
        { ok: false, error: 'solverMode must be local or live' },
        { status: 400 },
      );
    }

    const result = await runVerifiedOptimizationPipeline({
      problemId: body.problemId,
      tasks: body.tasks as Task[],
      agentCapacities: body.agentCapacities as AgentCapacity[],
      seed: typeof body.seed === 'number' ? body.seed : 0,
      solverMode: body.solverMode as 'local' | 'live' | undefined,
      timeout: typeof body.timeout === 'number' ? body.timeout : undefined,
      exactProofMaxVariables:
        typeof body.exactProofMaxVariables === 'number' ? body.exactProofMaxVariables : undefined,
    });

    return NextResponse.json({
      ok: result.verdict === 'VERIFIED_GLOBAL_OPTIMUM',
      result,
      actor: { userId: auth.userId, orgId: auth.orgId, role: auth.role },
      boundary: {
        executionPerformed: false,
        statement:
          'VERIFIED_GLOBAL_OPTIMUM is emitted only when Z3 verifies feasibility and deterministic exhaustive enumeration proves no binary QUBO state has lower energy within the configured exact-proof bound. Any other verdict remains non-executable.',
      },
    });
  } catch (error) {
    return handleApiError('api/dsg-one/optimization/verify', error, { status: 400 });
  }
}
