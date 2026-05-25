import { describe, expect, it } from 'vitest';
import { resolvePolicyDecision } from '../../../lib/agent-governance/policy';
import type { AgentStep } from '../../../lib/agent-governance/types';

function makeStep(policy_mode: AgentStep['policy_mode']): AgentStep {
  return {
    step_index: 0,
    tool: 'readiness',
    params: {},
    policy_mode,
    status: 'pending',
  };
}

describe('resolvePolicyDecision', () => {
  it('returns allow for an allow step', () => {
    expect(resolvePolicyDecision(makeStep('allow'))).toBe('allow');
  });

  it('returns review_required for a review_required step', () => {
    expect(resolvePolicyDecision(makeStep('review_required'))).toBe('review_required');
  });

  it('returns block for a block step', () => {
    expect(resolvePolicyDecision(makeStep('block'))).toBe('block');
  });

  it('is a direct pass-through of policy_mode', () => {
    const step = makeStep('allow');
    expect(resolvePolicyDecision(step)).toBe(step.policy_mode);
  });
});
