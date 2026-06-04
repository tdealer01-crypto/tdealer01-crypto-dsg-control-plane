import { describe, expect, it } from 'vitest';
import { decideExecutionBoundary } from '@/lib/dsg/brain/execution-role-boundary';

const BASE = {
  planAuthorized: true,
  scopeAligned: true,
  approvalSatisfied: true,
  auditWritable: true,
  evidenceWritable: true,
};

describe('Hermes / Nango / DSG execution boundary', () => {
  it('allows Hermes to execute plan-authorized work when DSG evidence gates are satisfied', () => {
    const verdict = decideExecutionBoundary({
      ...BASE,
      actor: 'hermes',
      action: 'execute_authorized_plan',
    });

    expect(verdict).toEqual({
      decision: 'allow',
      reasons: ['plan_aligned_and_evidence_bound'],
    });
  });

  it('denies Hermes when real credentials are required instead of routing through Nango', () => {
    const verdict = decideExecutionBoundary({
      ...BASE,
      actor: 'hermes',
      action: 'execute_authorized_plan',
      requiresRealCredential: true,
    });

    expect(verdict.decision).toBe('deny');
    expect(verdict.reasons).toContain('route_real_credentials_through_nango');
  });

  it('allows Nango to hold credentials and connect real APIs without making approval decisions', () => {
    expect(decideExecutionBoundary({ ...BASE, actor: 'nango', action: 'hold_credentials' }).decision).toBe('allow');
    expect(decideExecutionBoundary({ ...BASE, actor: 'nango', action: 'connect_real_api' }).decision).toBe('allow');
  });

  it('denies Nango when it attempts to plan or approve', () => {
    const verdict = decideExecutionBoundary({
      ...BASE,
      actor: 'nango',
      action: 'approve',
    });

    expect(verdict.decision).toBe('deny');
    expect(verdict.reasons).toContain('nango_is_not_planner_or_approval_authority');
  });

  it('allows DSG to verify scope and record audit/evidence but denies work outside the approved plan', () => {
    expect(decideExecutionBoundary({ ...BASE, actor: 'dsg', action: 'record_audit' }).decision).toBe('allow');

    const verdict = decideExecutionBoundary({
      ...BASE,
      actor: 'dsg',
      action: 'verify_plan_alignment',
      outsideApprovedPlan: true,
    });

    expect(verdict.decision).toBe('deny');
    expect(verdict.reasons).toContain('outside_approved_plan');
  });

  it('does not let DSG block a plan-authorized aligned action with audit and evidence available', () => {
    const verdict = decideExecutionBoundary({
      ...BASE,
      actor: 'dsg',
      action: 'verify_plan_alignment',
    });

    expect(verdict.decision).toBe('allow');
  });

  it('requires user takeover for DSG approval when approval is not yet satisfied', () => {
    const verdict = decideExecutionBoundary({
      ...BASE,
      actor: 'dsg',
      action: 'approve',
      approvalSatisfied: false,
    });

    expect(verdict.decision).toBe('needs_user_takeover');
    expect(verdict.reasons).toContain('approval_required');
  });
});
