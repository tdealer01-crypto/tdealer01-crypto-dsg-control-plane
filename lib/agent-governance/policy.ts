import type { AgentStep } from './types';

export function resolvePolicyDecision(step: AgentStep): AgentStep['policy_mode'] {
  return step.policy_mode;
}
