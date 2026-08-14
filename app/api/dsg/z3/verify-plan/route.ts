import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';
import { readJsonBody } from '@/lib/security/request-json';
import { logServerError, serverErrorResponse } from '@/lib/security/error-response';
import type { Z3ConstraintSet, SLAContract } from '@/lib/spine/types';
import { init } from 'z3-solver';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return buildPreflightResponse(request);
}

const SMT_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

const OP_SYMBOL: Record<SLAContract['operator'], string> = {
  lt: '<',
  lte: '<=',
  gt: '>',
  gte: '>=',
};

function smtNum(n: number): string {
  return n < 0 ? `(- ${Math.abs(n)})` : String(n);
}

interface CheckResult {
  constraint_id: string;
  kind: 'sla' | 'security_invariant' | 'resource_limit';
  description: string;
  evaluated: boolean;
  satisfied: boolean | null;
  severity?: string;
}

export async function POST(request: NextRequest) {
  try {
    const corsHeaders = buildCorsHeaders(request);
    const bodyResult = await readJsonBody<{
      plan: Record<string, unknown>;
      constraints: Z3ConstraintSet;
      max_violations?: number;
    }>(request, { maxBytes: 10 * 1024 });

    if (!bodyResult.ok) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status, headers: corsHeaders }
      );
    }

    const { plan, constraints, max_violations = 10 } = bodyResult.value!;

    if (!plan || !constraints) {
      return NextResponse.json(
        { error: 'plan and constraints required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const startTime = Date.now();
    const planHash = Buffer.from(JSON.stringify(plan)).toString('hex').slice(0, 32);
    const constraintHash = Buffer.from(JSON.stringify(constraints)).toString('hex').slice(0, 32);

    const checks: CheckResult[] = [];

    try {
      const { Context } = await init();
      const ctx = Context('main');

      // A requirement is violated iff NOT(requirement) is satisfiable under
      // the plan's fixed variable bindings — each check gets its own solver.
      const runCheck = async (
        id: string,
        kind: CheckResult['kind'],
        description: string,
        boundVars: Array<{ name: string; value: number }>,
        requirement: string,
        severity?: string
      ): Promise<CheckResult> => {
        try {
          const solver = new ctx.Solver();
          const decls = boundVars
            .map((v) => `(declare-const ${v.name} Real) (assert (= ${v.name} ${smtNum(v.value)}))`)
            .join(' ');
          if (decls) solver.fromString(decls);
          solver.fromString(`(assert (not ${requirement}))`);
          const status = await solver.check();
          return { constraint_id: id, kind, description, evaluated: true, satisfied: status === 'unsat', severity };
        } catch {
          return { constraint_id: id, kind, description, evaluated: false, satisfied: null, severity };
        }
      };

      for (const contract of constraints.slaContracts || []) {
        const id = `sla-${contract.metric}`;
        const actual = plan[contract.metric];
        if (!SMT_IDENTIFIER.test(contract.metric) || typeof actual !== 'number') {
          checks.push({ constraint_id: id, kind: 'sla', description: contract.description, evaluated: false, satisfied: null });
          continue;
        }
        const requirement = `(${OP_SYMBOL[contract.operator]} ${contract.metric} ${smtNum(contract.threshold)})`;
        checks.push(
          await runCheck(id, 'sla', contract.description, [{ name: contract.metric, value: actual }], requirement)
        );
      }

      // Security invariant expressions are expected as SMT-LIB v2 boolean
      // terms over numeric plan fields; every numeric plan field is bound
      // so invariants may reference any of them.
      const planNumericVars = Object.entries(plan)
        .filter((entry): entry is [string, number] => SMT_IDENTIFIER.test(entry[0]) && typeof entry[1] === 'number')
        .map(([name, value]) => ({ name, value }));

      for (const invariant of constraints.securityInvariants || []) {
        checks.push(
          await runCheck(
            `security-${invariant.name}`,
            'security_invariant',
            invariant.name,
            planNumericVars,
            invariant.expression,
            invariant.severity
          )
        );
      }

      const resourceLimits = constraints.resourceLimits;
      if (resourceLimits) {
        const resourceChecks: Array<{ key: string; planField: string; limit: number }> = [
          { key: 'maxConcurrentExecutions', planField: 'concurrentExecutions', limit: resourceLimits.maxConcurrentExecutions },
          { key: 'maxMemoryMB', planField: 'memoryMB', limit: resourceLimits.maxMemoryMB },
          { key: 'maxRpsPerAgent', planField: 'requestsPerSecond', limit: resourceLimits.maxRpsPerAgent },
        ];
        for (const rc of resourceChecks) {
          const id = `resource-${rc.key}`;
          const description = `${rc.planField} <= ${rc.key}`;
          const actual = plan[rc.planField];
          if (typeof actual !== 'number' || typeof rc.limit !== 'number') {
            checks.push({ constraint_id: id, kind: 'resource_limit', description, evaluated: false, satisfied: null });
            continue;
          }
          const requirement = `(<= ${rc.planField} ${smtNum(rc.limit)})`;
          checks.push(await runCheck(id, 'resource_limit', description, [{ name: rc.planField, value: actual }], requirement));
        }
      }
    } catch (solverError) {
      logServerError(solverError, 'z3-solver-verify-plan');
      return NextResponse.json(
        {
          plan_hash: planHash,
          constraint_hash: constraintHash,
          status: 'ERROR' as const,
          error: 'Z3 solver error',
          checks: [],
          violations: [],
          verification_time_ms: Date.now() - startTime,
          verified_at: new Date().toISOString(),
        },
        { status: 500, headers: corsHeaders }
      );
    }

    const evaluatedChecks = checks.filter((c) => c.evaluated);
    const violations = evaluatedChecks
      .filter((c) => c.satisfied === false)
      .slice(0, max_violations)
      .map((c) => ({
        constraint_id: c.constraint_id,
        severity: c.severity || 'medium',
        description: c.description,
      }));

    const slaChecks = evaluatedChecks.filter((c) => c.kind === 'sla');
    const securityChecks = evaluatedChecks.filter((c) => c.kind === 'security_invariant');
    const resourceLimitChecks = evaluatedChecks.filter((c) => c.kind === 'resource_limit');

    const complianceScore =
      evaluatedChecks.length > 0
        ? Math.round((evaluatedChecks.filter((c) => c.satisfied).length / evaluatedChecks.length) * 10000) / 100
        : 0;

    // Only claim VERIFIED when something was actually checked — an empty or
    // fully-skipped check set must never read as a pass.
    const status: 'VERIFIED' | 'VIOLATIONS_FOUND' | 'INCONCLUSIVE' =
      violations.length > 0 ? 'VIOLATIONS_FOUND' : evaluatedChecks.length > 0 ? 'VERIFIED' : 'INCONCLUSIVE';

    const verification = {
      plan_hash: planHash,
      constraint_hash: constraintHash,
      status,
      checks_total: checks.length,
      checks_evaluated: evaluatedChecks.length,
      checks_skipped: checks.length - evaluatedChecks.length,
      violations,
      compliance_score: complianceScore,
      sla_compliant: slaChecks.every((c) => c.satisfied),
      security_invariants_satisfied: securityChecks.every((c) => c.satisfied),
      resource_limits_respected: resourceLimitChecks.every((c) => c.satisfied),
      verified_at: new Date().toISOString(),
      verification_time_ms: Date.now() - startTime,
    };

    return NextResponse.json(verification, { headers: corsHeaders });
  } catch (error) {
    logServerError(error, 'z3-verify-plan');
    return serverErrorResponse({ status: 500 });
  }
}
