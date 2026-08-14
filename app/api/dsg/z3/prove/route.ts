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
      theorem: string;
      timeout?: number;
    }>(request, { maxBytes: 10 * 1024 });

    if (!bodyResult.ok) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status, headers: corsHeaders }
      );
    }

    const { constraints, theorem, timeout = 10000 } = bodyResult.value!;

    if (!constraints || !theorem) {
      return NextResponse.json(
        { error: 'constraints and theorem required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const startTime = Date.now();

    try {
      const { Context } = await init();
      const ctx = Context('main');
      const solver = new ctx.Solver();

      try {
        solver.set('timeout', timeout);
      } catch {
        // Older Z3 binaries may not support timeout; continue anyway
      }

      // Load caller-supplied declarations/assumptions (raw SMT-LIB v2 strings).
      if (Array.isArray(constraints.constraints)) {
        for (const constraint of constraints.constraints) {
          if (typeof constraint === 'string') {
            solver.fromString(constraint);
          }
        }
      }

      // A theorem holds under the given constraints iff
      // (constraints AND NOT theorem) is unsatisfiable.
      solver.fromString(`(assert (not ${theorem}))`);

      const statusStr = await solver.check();
      const status: 'PROVEN' | 'DISPROVEN' | 'UNKNOWN' =
        statusStr === 'unsat' ? 'PROVEN' : statusStr === 'sat' ? 'DISPROVEN' : 'UNKNOWN';

      let counterexample: Record<string, string> | null = null;
      if (statusStr === 'sat') {
        try {
          const m = solver.model();
          counterexample = {};
          for (const decl of m.decls()) {
            counterexample[decl.name().toString()] = m.get(decl).toString();
          }
        } catch {
          // Model extraction is best-effort
        }
      }

      const proof = {
        theorem,
        status,
        counterexample,
        proof_hash: Buffer.from(
          JSON.stringify({ theorem, constraints, status, counterexample })
        ).toString('hex').slice(0, 32),
        constraints_id: constraints.id || 'default',
        constraint_count: constraints.constraints?.length || 0,
        sla_contracts: constraints.slaContracts.length,
        security_invariants: constraints.securityInvariants.length,
        proof_time_ms: Date.now() - startTime,
        verified_at: new Date().toISOString(),
      };

      return NextResponse.json(proof, { headers: corsHeaders });
    } catch (solverError) {
      logServerError(solverError, 'z3-solver-prove');
      return NextResponse.json(
        {
          theorem,
          status: 'ERROR' as const,
          error: 'Z3 solver error',
          counterexample: null,
          proof_hash: '',
          constraints_id: constraints.id || 'default',
          constraint_count: constraints.constraints?.length || 0,
          sla_contracts: constraints.slaContracts.length,
          security_invariants: constraints.securityInvariants.length,
          proof_time_ms: Date.now() - startTime,
          verified_at: new Date().toISOString(),
        },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    logServerError(error, 'z3-prove');
    return serverErrorResponse({ status: 500 });
  }
}
