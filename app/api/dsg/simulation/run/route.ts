import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';
import { readJsonBody } from '@/lib/security/request-json';
import { logServerError, serverErrorResponse } from '@/lib/security/error-response';
import type { Z3ConstraintSet } from '@/lib/spine/types';
import { createProductionSimulator, recordRun } from '@/lib/deeptutor/production-simulator';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return buildPreflightResponse(request);
}

export async function POST(request: NextRequest) {
  try {
    const corsHeaders = buildCorsHeaders(request);
    const bodyResult = await readJsonBody<{
      constraints: Z3ConstraintSet;
      maxScenarios?: number;
      intervalMs?: number;
      explorationDepth?: number;
      timeAcceleration?: number;
      probabilityThreshold?: number;
      runSingle?: boolean;
    }>(request, { maxBytes: 64 * 1024 });

    if (!bodyResult.ok) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status, headers: corsHeaders }
      );
    }

    const {
      constraints,
      maxScenarios = 10,
      intervalMs = 60000,
      explorationDepth = 3,
      timeAcceleration = 10,
      probabilityThreshold = 0.01,
      runSingle = true,
    } = bodyResult.value!;

    if (!constraints) {
      return NextResponse.json(
        { error: 'constraints required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const simulator = createProductionSimulator({
      maxScenarios,
      intervalMs,
      explorationDepth,
      timeAcceleration,
      probabilityThreshold,
    });

    const response: Record<string, unknown> = {
      ok: true,
      run: null,
      summary: null,
    };

    if (runSingle) {
      const run = await simulator.runSingleSimulation(constraints);
      if (!run) {
        return NextResponse.json(
          { error: 'no_satisfying_scenarios' },
          { status: 422, headers: corsHeaders }
        );
      }
      recordRun(run);
      response.run = run;
      response.summary = simulator.getSummaryReport();
    } else {
      await simulator.startContinuousSimulation(constraints);
      await new Promise((resolve) => setTimeout(resolve, 30));
      const state = simulator.getState();
      const run = state.currentRun;
      if (run) recordRun(run);
      response.state = state;
      response.run = run || null;
      response.summary = simulator.getSummaryReport();
    }

    return NextResponse.json(response, { headers: corsHeaders });
  } catch (error) {
    logServerError(error, 'simulation-run');
    return serverErrorResponse({ status: 500 });
  }
}
