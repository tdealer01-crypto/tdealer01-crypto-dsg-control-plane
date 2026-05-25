import { describe, expect, it } from 'vitest';
import {
  buildSmt2InvariantInput,
  evaluateSmt2InvariantInput,
  renderGatewayInvariantSmt2,
} from '../../../lib/gateway/invariants/smt2';
import type { GatewayToolRequest } from '../../../lib/gateway/types';

const validRequest: GatewayToolRequest = {
  orgId: 'org-1',
  actorId: 'user-1',
  actorRole: 'owner',
  orgPlan: 'pro',
  toolName: 'zapier.slack.post_message',
  action: 'post_message',
  input: {},
};

const validTool = {
  action: 'post_message',
  risk: 'low',
  requiresApproval: false,
};

const fullyValidInput = {
  hasOrg: true,
  hasActor: true,
  hasActorRole: true,
  hasOrgPlan: true,
  isRegisteredTool: true,
  actionMatchesTool: true,
  actorRoleAllowed: true,
  planEntitled: true,
  risk: 0 as const,
  requiresApproval: false,
  hasApproval: false,
  evidenceWritable: true,
};

// ─── buildSmt2InvariantInput ────────────────────────────────────────────

describe('buildSmt2InvariantInput', () => {
  it('maps a fully valid request to all-true flags', () => {
    const input = buildSmt2InvariantInput(validRequest, validTool);
    expect(input.hasOrg).toBe(true);
    expect(input.hasActor).toBe(true);
    expect(input.hasActorRole).toBe(true);
    expect(input.hasOrgPlan).toBe(true);
    expect(input.isRegisteredTool).toBe(true);
    expect(input.actionMatchesTool).toBe(true);
    expect(input.actorRoleAllowed).toBe(true);
    expect(input.planEntitled).toBe(true);
    expect(input.evidenceWritable).toBe(true);
  });

  it('sets hasOrg:false when orgId is empty', () => {
    const input = buildSmt2InvariantInput({ ...validRequest, orgId: '' }, validTool);
    expect(input.hasOrg).toBe(false);
  });

  it('sets hasActor:false when actorId is empty', () => {
    const input = buildSmt2InvariantInput({ ...validRequest, actorId: '' }, validTool);
    expect(input.hasActor).toBe(false);
  });

  it('sets hasActorRole:false when actorRole is empty', () => {
    const input = buildSmt2InvariantInput({ ...validRequest, actorRole: '' }, validTool);
    expect(input.hasActorRole).toBe(false);
  });

  it('sets hasOrgPlan:false when orgPlan is empty', () => {
    const input = buildSmt2InvariantInput({ ...validRequest, orgPlan: '' }, validTool);
    expect(input.hasOrgPlan).toBe(false);
  });

  it('sets isRegisteredTool:false and actionMatchesTool:false when tool is null', () => {
    const input = buildSmt2InvariantInput(validRequest, null);
    expect(input.isRegisteredTool).toBe(false);
    expect(input.actionMatchesTool).toBe(false);
  });

  it('sets actionMatchesTool:false when tool action does not match request action', () => {
    const input = buildSmt2InvariantInput(
      { ...validRequest, action: 'delete' },
      { ...validTool, action: 'post_message' }
    );
    expect(input.actionMatchesTool).toBe(false);
  });

  it.each(['owner', 'admin', 'finance_admin', 'finance_approver', 'agent_operator'])(
    'sets actorRoleAllowed:true for allowed role "%s"',
    (role) => {
      const input = buildSmt2InvariantInput({ ...validRequest, actorRole: role }, validTool);
      expect(input.actorRoleAllowed).toBe(true);
    }
  );

  it.each(['viewer', 'guest', 'auditor', 'readonly'])(
    'sets actorRoleAllowed:false for disallowed role "%s"',
    (role) => {
      const input = buildSmt2InvariantInput({ ...validRequest, actorRole: role }, validTool);
      expect(input.actorRoleAllowed).toBe(false);
    }
  );

  it('is case-insensitive for actorRole', () => {
    const input = buildSmt2InvariantInput({ ...validRequest, actorRole: 'OWNER' }, validTool);
    expect(input.actorRoleAllowed).toBe(true);
  });

  it.each(['pro', 'business', 'enterprise'])(
    'sets planEntitled:true for entitled plan "%s"',
    (plan) => {
      const input = buildSmt2InvariantInput({ ...validRequest, orgPlan: plan }, validTool);
      expect(input.planEntitled).toBe(true);
    }
  );

  it('sets planEntitled:false for free plan', () => {
    const input = buildSmt2InvariantInput({ ...validRequest, orgPlan: 'free' }, validTool);
    expect(input.planEntitled).toBe(false);
  });

  it('is case-insensitive for orgPlan', () => {
    const input = buildSmt2InvariantInput({ ...validRequest, orgPlan: 'PRO' }, validTool);
    expect(input.planEntitled).toBe(true);
  });

  it.each([
    ['critical', 3],
    ['high', 2],
    ['medium', 1],
    ['low', 0],
  ] as const)('maps risk "%s" to integer %d', (riskStr, expected) => {
    const input = buildSmt2InvariantInput(validRequest, { ...validTool, risk: riskStr });
    expect(input.risk).toBe(expected);
  });

  it('defaults risk to 0 when tool has unknown risk value', () => {
    const input = buildSmt2InvariantInput(validRequest, { ...validTool, risk: 'unknown' });
    expect(input.risk).toBe(0);
  });

  it('sets hasApproval:true when approvalToken is present', () => {
    const input = buildSmt2InvariantInput({ ...validRequest, approvalToken: 'tok_abc' }, validTool);
    expect(input.hasApproval).toBe(true);
  });

  it('sets hasApproval:false when approvalToken is absent', () => {
    const input = buildSmt2InvariantInput(validRequest, validTool);
    expect(input.hasApproval).toBe(false);
  });

  it('defaults evidenceWritable to true', () => {
    const input = buildSmt2InvariantInput(validRequest, validTool);
    expect(input.evidenceWritable).toBe(true);
  });

  it('respects explicit evidenceWritable:false', () => {
    const input = buildSmt2InvariantInput(validRequest, validTool, false);
    expect(input.evidenceWritable).toBe(false);
  });
});

// ─── evaluateSmt2InvariantInput ──────────────────────────────────────────

describe('evaluateSmt2InvariantInput', () => {
  it('returns ok:true and allow with no violations for fully valid input', () => {
    const result = evaluateSmt2InvariantInput(fullyValidInput);
    expect(result.ok).toBe(true);
    expect(result.decision).toBe('allow');
    expect(result.violated).toEqual([]);
  });

  it.each([
    ['missing_org_id', { hasOrg: false }],
    ['missing_actor_id', { hasActor: false }],
    ['missing_actor_role', { hasActorRole: false }],
    ['missing_org_plan', { hasOrgPlan: false }],
    ['tool_not_registered', { isRegisteredTool: false }],
    ['tool_action_mismatch', { actionMatchesTool: false }],
    ['role_not_allowed', { actorRoleAllowed: false }],
    ['plan_not_entitled', { planEntitled: false }],
    ['evidence_not_writable', { evidenceWritable: false }],
  ] as const)('reports violation "%s" when flag is false', (violation, override) => {
    const result = evaluateSmt2InvariantInput({ ...fullyValidInput, ...override });
    expect(result.ok).toBe(false);
    expect(result.decision).toBe('block');
    expect(result.violated).toContain(violation);
  });

  it('reports approval_required when requiresApproval:true and no token', () => {
    const result = evaluateSmt2InvariantInput({
      ...fullyValidInput,
      requiresApproval: true,
      hasApproval: false,
    });
    expect(result.violated).toContain('approval_required');
  });

  it('reports approval_required when risk >= 2 (high) and no token', () => {
    const result = evaluateSmt2InvariantInput({
      ...fullyValidInput,
      risk: 2,
      hasApproval: false,
    });
    expect(result.violated).toContain('approval_required');
  });

  it('reports approval_required when risk == 3 (critical) and no token', () => {
    const result = evaluateSmt2InvariantInput({
      ...fullyValidInput,
      risk: 3,
      hasApproval: false,
    });
    expect(result.violated).toContain('approval_required');
  });

  it('does NOT report approval_required when risk == 1 (medium) and requiresApproval:false', () => {
    const result = evaluateSmt2InvariantInput({
      ...fullyValidInput,
      risk: 1,
      requiresApproval: false,
      hasApproval: false,
    });
    expect(result.violated).not.toContain('approval_required');
    expect(result.ok).toBe(true);
  });

  it('allows high-risk action when approval token is present', () => {
    const result = evaluateSmt2InvariantInput({
      ...fullyValidInput,
      risk: 2,
      hasApproval: true,
    });
    expect(result.ok).toBe(true);
    expect(result.violated).not.toContain('approval_required');
  });

  it('collects multiple violations at once', () => {
    const result = evaluateSmt2InvariantInput({
      ...fullyValidInput,
      hasOrg: false,
      hasActor: false,
      planEntitled: false,
    });
    expect(result.violated).toContain('missing_org_id');
    expect(result.violated).toContain('missing_actor_id');
    expect(result.violated).toContain('plan_not_entitled');
    expect(result.violated.length).toBeGreaterThanOrEqual(3);
  });

  it('produces deterministic smt2Hash for identical inputs', () => {
    const r1 = evaluateSmt2InvariantInput(fullyValidInput);
    const r2 = evaluateSmt2InvariantInput(fullyValidInput);
    expect(r1.smt2Hash).toBe(r2.smt2Hash);
  });

  it('produces deterministic resultHash for identical inputs', () => {
    const r1 = evaluateSmt2InvariantInput(fullyValidInput);
    const r2 = evaluateSmt2InvariantInput(fullyValidInput);
    expect(r1.resultHash).toBe(r2.resultHash);
  });

  it('resultHash differs when violations differ', () => {
    const r1 = evaluateSmt2InvariantInput(fullyValidInput);
    const r2 = evaluateSmt2InvariantInput({ ...fullyValidInput, hasOrg: false });
    expect(r1.resultHash).not.toBe(r2.resultHash);
  });

  it('smt2Hash differs when input differs', () => {
    const r1 = evaluateSmt2InvariantInput(fullyValidInput);
    const r2 = evaluateSmt2InvariantInput({ ...fullyValidInput, risk: 2 });
    expect(r1.smt2Hash).not.toBe(r2.smt2Hash);
  });

  it('smt2 string contains (check-sat)', () => {
    const result = evaluateSmt2InvariantInput(fullyValidInput);
    expect(result.smt2).toContain('(check-sat)');
  });

  it('smt2Hash is a 64-char hex string (SHA-256)', () => {
    const result = evaluateSmt2InvariantInput(fullyValidInput);
    expect(result.smt2Hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('resultHash is a 64-char hex string (SHA-256)', () => {
    const result = evaluateSmt2InvariantInput(fullyValidInput);
    expect(result.resultHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ─── renderGatewayInvariantSmt2 ───────────────────────────────────────────

describe('renderGatewayInvariantSmt2', () => {
  it('includes (set-logic QF_UFLIA)', () => {
    const smt2 = renderGatewayInvariantSmt2(fullyValidInput);
    expect(smt2).toContain('(set-logic QF_UFLIA)');
  });

  it('includes (check-sat) and (get-model)', () => {
    const smt2 = renderGatewayInvariantSmt2(fullyValidInput);
    expect(smt2).toContain('(check-sat)');
    expect(smt2).toContain('(get-model)');
  });

  it('asserts true for all flags when input is fully valid', () => {
    const smt2 = renderGatewayInvariantSmt2(fullyValidInput);
    expect(smt2).toContain('(assert (= has_org true))');
    expect(smt2).toContain('(assert (= has_actor true))');
    expect(smt2).toContain('(assert (= evidence_writable true))');
  });

  it('asserts false for missing flags', () => {
    const smt2 = renderGatewayInvariantSmt2({ ...fullyValidInput, hasOrg: false });
    expect(smt2).toContain('(assert (= has_org false))');
  });

  it('renders risk as the correct integer', () => {
    const smt2 = renderGatewayInvariantSmt2({ ...fullyValidInput, risk: 3 });
    expect(smt2).toContain('(assert (= risk 3))');
  });

  it('renders risk 0 for low-risk input', () => {
    const smt2 = renderGatewayInvariantSmt2(fullyValidInput);
    expect(smt2).toContain('(assert (= risk 0))');
  });

  it('is deterministic — same input produces identical output', () => {
    const s1 = renderGatewayInvariantSmt2(fullyValidInput);
    const s2 = renderGatewayInvariantSmt2(fullyValidInput);
    expect(s1).toBe(s2);
  });

  it('includes the approval implication assertion', () => {
    const smt2 = renderGatewayInvariantSmt2(fullyValidInput);
    expect(smt2).toContain('(assert (=> (or requires_approval (>= risk 2)) has_approval))');
  });

  it('declares all 12 constants', () => {
    const smt2 = renderGatewayInvariantSmt2(fullyValidInput);
    const expected = [
      'has_org', 'has_actor', 'has_actor_role', 'has_org_plan',
      'is_registered_tool', 'action_matches_tool', 'actor_role_allowed',
      'plan_entitled', 'risk', 'requires_approval', 'has_approval', 'evidence_writable',
    ];
    for (const name of expected) {
      expect(smt2).toContain(`declare-const ${name}`);
    }
  });
});
