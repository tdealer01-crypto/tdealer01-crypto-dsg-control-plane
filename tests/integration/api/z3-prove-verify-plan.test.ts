import { describe, it, expect } from 'vitest';
import { POST as proveRoute } from '../../../app/api/dsg/z3/prove/route';
import { POST as verifyPlanRoute } from '../../../app/api/dsg/z3/verify-plan/route';
import type { Z3ConstraintSet } from '../../../lib/spine/types';

function baseConstraints(overrides: Partial<Z3ConstraintSet> = {}): Z3ConstraintSet {
  return {
    slaContracts: [],
    securityInvariants: [],
    resourceLimits: { maxConcurrentExecutions: 10, maxMemoryMB: 512, maxRpsPerAgent: 100 },
    auditRequirements: [],
    ...overrides,
  };
}

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { origin: 'https://app.example.com', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/dsg/z3/prove — real z3-solver theorem proving', () => {
  it('returns PROVEN when the theorem is a real logical consequence of the constraints', async () => {
    const constraints = baseConstraints({
      constraints: ['(declare-const x Int) (assert (> x 0)) (assert (< x 10))'],
    });

    const res = await proveRoute(
      jsonRequest('http://localhost/api/dsg/z3/prove', {
        constraints,
        theorem: '(> x -1)',
      }) as never
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('PROVEN');
    expect(body.counterexample).toBeNull();
  });

  it('returns DISPROVEN with a counterexample when the theorem does not always hold', async () => {
    const constraints = baseConstraints({
      constraints: ['(declare-const y Int) (assert (> y 0)) (assert (< y 10))'],
    });

    const res = await proveRoute(
      jsonRequest('http://localhost/api/dsg/z3/prove', {
        constraints,
        theorem: '(> y 5)',
      }) as never
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('DISPROVEN');
    expect(body.counterexample).not.toBeNull();
  });

  it('returns 400 when theorem is missing', async () => {
    const res = await proveRoute(
      jsonRequest('http://localhost/api/dsg/z3/prove', {
        constraints: baseConstraints(),
      }) as never
    );

    expect(res.status).toBe(400);
  });
});

describe('/api/dsg/z3/verify-plan — real z3-solver plan verification', () => {
  it('reports VERIFIED when the plan satisfies all SLA contracts', async () => {
    const constraints = baseConstraints({
      slaContracts: [
        { metric: 'latency_p99_ms', operator: 'lt', threshold: 500, description: 'p99 under 500ms' },
      ],
    });

    const res = await verifyPlanRoute(
      jsonRequest('http://localhost/api/dsg/z3/verify-plan', {
        plan: { latency_p99_ms: 300 },
        constraints,
      }) as never
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('VERIFIED');
    expect(body.violations).toHaveLength(0);
    expect(body.sla_compliant).toBe(true);
  });

  it('reports VIOLATIONS_FOUND when the plan breaches an SLA contract', async () => {
    const constraints = baseConstraints({
      slaContracts: [
        { metric: 'latency_p99_ms', operator: 'lt', threshold: 500, description: 'p99 under 500ms' },
      ],
    });

    const res = await verifyPlanRoute(
      jsonRequest('http://localhost/api/dsg/z3/verify-plan', {
        plan: { latency_p99_ms: 800 },
        constraints,
      }) as never
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('VIOLATIONS_FOUND');
    expect(body.violations).toEqual([
      expect.objectContaining({ constraint_id: 'sla-latency_p99_ms' }),
    ]);
    expect(body.compliance_score).toBe(0);
  });

  it('never reports VERIFIED when nothing could be evaluated (regression guard for the old always-pass mock)', async () => {
    const constraints = baseConstraints({
      slaContracts: [
        { metric: 'latency_p99_ms', operator: 'lt', threshold: 500, description: 'p99 under 500ms' },
      ],
    });

    // Plan carries no field matching the contract's metric, so it can't be evaluated.
    const res = await verifyPlanRoute(
      jsonRequest('http://localhost/api/dsg/z3/verify-plan', {
        plan: { unrelated_field: 1 },
        constraints,
      }) as never
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('INCONCLUSIVE');
    expect(body.checks_evaluated).toBe(0);
    expect(body.compliance_score).toBe(0);
  });

  it('evaluates a security invariant expressed as an SMT-LIB v2 term over plan variables', async () => {
    const constraints = baseConstraints({
      securityInvariants: [
        { name: 'token-budget', expression: '(<= tokensUsed maxTokenBudget)', severity: 'high' },
      ],
    });

    const res = await verifyPlanRoute(
      jsonRequest('http://localhost/api/dsg/z3/verify-plan', {
        plan: { tokensUsed: 500, maxTokenBudget: 1000000 },
        constraints,
      }) as never
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('VERIFIED');
    expect(body.security_invariants_satisfied).toBe(true);
  });

  it('returns 400 when plan or constraints are missing', async () => {
    const res = await verifyPlanRoute(
      jsonRequest('http://localhost/api/dsg/z3/verify-plan', {
        constraints: baseConstraints(),
      }) as never
    );

    expect(res.status).toBe(400);
  });
});
