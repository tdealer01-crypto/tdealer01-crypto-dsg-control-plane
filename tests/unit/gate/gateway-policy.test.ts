import { describe, it, expect } from 'vitest';
import { evaluateGatewayToolRequest } from '../../../lib/gateway/policy';
import type { GatewayToolRequest, GatewayToolRegistryEntry } from '../../../lib/gateway/types';

const validRequest: GatewayToolRequest = {
  orgId: 'org-1',
  actorId: 'user-1',
  actorRole: 'owner',
  orgPlan: 'pro',
  toolName: 'zapier.slack.post_message',
  action: 'post_message',
  input: {},
};

const validTool: GatewayToolRegistryEntry = {
  name: 'zapier.slack.post_message',
  provider: 'zapier',
  action: 'post_message',
  risk: 'medium',
  executionMode: 'sync',
  requiresApproval: false,
  description: 'Post a message to Slack',
};

describe('evaluateGatewayToolRequest', () => {
  it('allows a fully valid request', () => {
    const result = evaluateGatewayToolRequest(validRequest, validTool);
    expect(result.decision).toBe('allow');
  });

  it('blocks when orgId is missing', () => {
    const result = evaluateGatewayToolRequest({ ...validRequest, orgId: '' }, validTool);
    expect(result.decision).toBe('block');
    expect(result.reason).toBe('missing_org_id');
  });

  it('blocks when actorId is missing', () => {
    const result = evaluateGatewayToolRequest({ ...validRequest, actorId: '' }, validTool);
    expect(result.decision).toBe('block');
    expect(result.reason).toBe('missing_actor_id');
  });

  it('blocks when actorRole is missing', () => {
    const result = evaluateGatewayToolRequest({ ...validRequest, actorRole: '' }, validTool);
    expect(result.decision).toBe('block');
    expect(result.reason).toBe('missing_actor_role');
  });

  it('blocks when orgPlan is missing', () => {
    const result = evaluateGatewayToolRequest({ ...validRequest, orgPlan: '' }, validTool);
    expect(result.decision).toBe('block');
    expect(result.reason).toBe('missing_org_plan');
  });

  it('blocks when tool is null (not registered)', () => {
    const result = evaluateGatewayToolRequest(validRequest, null);
    expect(result.decision).toBe('block');
    expect(result.reason).toBe('tool_not_registered');
  });

  it('blocks when tool action does not match request action', () => {
    const result = evaluateGatewayToolRequest({ ...validRequest, action: 'delete' }, validTool);
    expect(result.decision).toBe('block');
    expect(result.reason).toBe('tool_action_mismatch');
  });

  it('blocks when actorRole is not in WRITE_ROLES', () => {
    const result = evaluateGatewayToolRequest({ ...validRequest, actorRole: 'viewer' }, validTool);
    expect(result.decision).toBe('block');
    expect(result.reason).toBe('role_not_allowed');
  });

  it.each(['owner', 'admin', 'finance_admin', 'finance_approver', 'agent_operator'])(
    'allows actorRole "%s" (in WRITE_ROLES)',
    (role) => {
      const result = evaluateGatewayToolRequest({ ...validRequest, actorRole: role }, validTool);
      expect(result.decision).toBe('allow');
    }
  );

  it('blocks when orgPlan is not in EXECUTION_PLANS', () => {
    const result = evaluateGatewayToolRequest({ ...validRequest, orgPlan: 'free' }, validTool);
    expect(result.decision).toBe('block');
    expect(result.reason).toBe('plan_not_entitled');
  });

  it.each(['pro', 'business', 'enterprise'])(
    'allows plan "%s" (in EXECUTION_PLANS)',
    (plan) => {
      const result = evaluateGatewayToolRequest({ ...validRequest, orgPlan: plan }, validTool);
      expect(result.decision).toBe('allow');
    }
  );

  it('returns review when requiresApproval=true and no token', () => {
    const criticalTool = { ...validTool, requiresApproval: true, risk: 'critical' as const };
    const result = evaluateGatewayToolRequest(validRequest, criticalTool);
    expect(result.decision).toBe('review');
    expect(result.reason).toBe('approval_required');
  });

  it('allows when requiresApproval=true and approval token present', () => {
    const criticalTool = { ...validTool, requiresApproval: true, risk: 'critical' as const };
    const result = evaluateGatewayToolRequest(
      { ...validRequest, approvalToken: 'tok_abc123' },
      criticalTool
    );
    expect(result.decision).toBe('allow');
  });

  it('returns review when risk is critical even if requiresApproval=false', () => {
    const criticalRiskTool = { ...validTool, requiresApproval: false, risk: 'critical' as const };
    const result = evaluateGatewayToolRequest(validRequest, criticalRiskTool);
    expect(result.decision).toBe('review');
    expect(result.reason).toBe('approval_required');
  });

  it('returns review when executionMode is critical', () => {
    const criticalModeTool = { ...validTool, executionMode: 'critical' as const, requiresApproval: false, risk: 'medium' as const };
    const result = evaluateGatewayToolRequest(validRequest, criticalModeTool);
    expect(result.decision).toBe('review');
  });

  it('is case-insensitive for actorRole', () => {
    const result = evaluateGatewayToolRequest({ ...validRequest, actorRole: 'OWNER' }, validTool);
    expect(result.decision).toBe('allow');
  });

  it('is case-insensitive for orgPlan', () => {
    const result = evaluateGatewayToolRequest({ ...validRequest, orgPlan: 'PRO' }, validTool);
    expect(result.decision).toBe('allow');
  });
});
