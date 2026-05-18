import { describe, expect, it } from 'vitest';
import { validateDraftPlan, validatePlannerInput } from '../../../lib/dsg/planner/generate';

describe('dsg planner generate', () => {
  it('validates planner input', () => {
    expect(validatePlannerInput({ goal: 'test', domain: 'ai_agent', riskLevel: 'low', mode: 'monitor' })).toBeTruthy();
    expect(validatePlannerInput({ goal: '', domain: 'ai_agent', riskLevel: 'low', mode: 'monitor' })).toBeNull();
  });

  it('validates draft plan schema', () => {
    const plan = validateDraftPlan({
      requestedAction: 'x', actor: 'operator', resource: 'ai_agent', riskLevel: 'low', policyVersion: '1.0',
      requiredApproval: 'operator', requiredEvidence: ['policyVersion'], connectorDependency: 'none', riskReason: 'test',
      steps: [{ id: 's1', title: 't', purpose: 'p', evidenceRequired: ['goal_text'], risk: 'low' }],
    });
    expect(plan).toBeTruthy();
    expect(validateDraftPlan({ steps: [] })).toBeNull();
  });
});
