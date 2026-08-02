import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';
import { readJsonBody } from '@/lib/security/request-json';
import { logServerError, serverErrorResponse } from '@/lib/security/error-response';
import type { Z3ConstraintSet } from '@/lib/spine/types';
import { init } from 'z3-solver';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return buildPreflightResponse(request);
}

export async function POST(request: NextRequest) {
  try {
    const corsHeaders = buildCorsHeaders(request);
    const bodyResult = await readJsonBody<{
      constraints: Z3ConstraintSet;
      input: Record<string, unknown>;
      timeout?: number;
    }>(request, { maxBytes: 10 * 1024 });

    if (!bodyResult.ok) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status, headers: corsHeaders }
      );
    }

    const { constraints, input, timeout = 5000 } = bodyResult.value!;

    if (!constraints) {
      return NextResponse.json(
        { error: 'constraints required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const startTime = Date.now();

    try {
      const { Context } = await init();
      const ctx = Context('main');
      const solver = new ctx.Solver();

      // Set solver timeout
      try {
        solver.set('timeout', timeout);
      } catch {
        // Older Z3 binaries may not support timeout; continue anyway
      }

      // Parse constraints (expect SMT-LIB v2 format strings)
      if (Array.isArray(constraints)) {
        for (const constraint of constraints) {
          if (typeof constraint === 'string') {
            solver.fromString(constraint);
          }
        }
      }

      const statusStr = await solver.check();
      const status = statusStr === 'sat' ? 'sat' : statusStr === 'unsat' ? 'unsat' : 'unknown';

      let model: Record<string, string> | null = null;
      if (status === 'sat') {
        try {
          const m = solver.model();
          model = {};
          for (const decl of m.decls()) {
            model[decl.name().toString()] = m.get(decl).toString();
          }
        } catch {
          // Model extraction is best-effort
        }
      }

      const result = {
        status: status.toUpperCase() as 'SAT' | 'UNSAT' | 'UNKNOWN',
        satisfiable: status === 'sat',
        model,
        proof_hash: Buffer.from(
          JSON.stringify({ constraints, status, model })
        ).toString('hex').slice(0, 32),
        constraints_hash: Buffer.from(
          JSON.stringify(constraints)
        ).toString('hex').slice(0, 32),
        evaluation_time_ms: Date.now() - startTime,
      };

      return NextResponse.json(result, { headers: corsHeaders });
    } catch (solverError) {
      logServerError(solverError, 'z3-solver-execution');
      return NextResponse.json(
        {
          status: 'UNKNOWN' as const,
          satisfiable: false,
          model: null,
          error: 'Z3 solver error',
          proof_hash: '',
          constraints_hash: Buffer.from(
            JSON.stringify(constraints)
          ).toString('hex').slice(0, 32),
          evaluation_time_ms: Date.now() - startTime,
        },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    logServerError(error, 'z3-evaluate');
    return serverErrorResponse({ status: 500 });
  }
}
