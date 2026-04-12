import { describe, it, expect } from 'vitest';
import { planGoal } from '../../../lib/agent/planner';
import { normalizeSpinePayload } from '../../../lib/spine/request';

describe('planGoal — keyword → tool mapping', () => {
  it('plans readiness check for "check status"', () => {
    const plan = planGoal('check status');
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].toolId).toBe('readiness');
  });

  it('plans readiness + execute for "run agt_hermes_01"', () => {
    const plan = planGoal('run agt_hermes_01');
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].toolId).toBe('readiness');
    expect(plan.steps[1].toolId).toBe('execute_action');
    expect(plan.steps[1].params.agent_id).toBe('agt_hermes_01');
  });

  it('plans audit + recovery for "audit lineage agt_test_01"', () => {
    const plan = planGoal('audit lineage agt_test_01');
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].toolId).toBe('audit_summary');
    expect(plan.steps[1].toolId).toBe('recovery_validate');
    expect(plan.steps[0].params.agent_id).toBe('agt_test_01');
  });

  it('plans checkpoint for "บันทึก agt_prod_01"', () => {
    const plan = planGoal('บันทึก agt_prod_01');
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].toolId).toBe('recovery_validate');
    expect(plan.steps[1].toolId).toBe('checkpoint');
  });

  it('plans capacity for "check โควต้า"', () => {
    const plan = planGoal('check โควต้า');
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].toolId).toBe('capacity');
  });

  it('plans list_policies for "show policy"', () => {
    const plan = planGoal('show policy');
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].toolId).toBe('list_policies');
  });

  it('plans reconcile_effect with failed status', () => {
    const plan = planGoal('reconcile eff_abc123 failed');
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].toolId).toBe('reconcile_effect');
    expect(plan.steps[0].params.effect_id).toBe('eff_abc123');
    expect(plan.steps[0].params.status).toBe('failed');
  });

  it('plans create_agent for "สร้างเอเจนต์"', () => {
    const plan = planGoal('สร้างเอเจนต์');
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].toolId).toBe('create_agent');
    expect(plan.steps[0].params.name).toBe('New Agent');
  });

  it('defaults to readiness + list_agents for unknown message', () => {
    const plan = planGoal('hello world');
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].toolId).toBe('readiness');
    expect(plan.steps[1].toolId).toBe('list_agents');
  });

  it('step IDs are sequential', () => {
    const plan = planGoal('execute something');
    expect(plan.steps.map((s) => s.id)).toEqual(['s1', 's2']);
  });
});

describe('normalizeSpinePayload — flat and nested formats', () => {
  it('normalizes flat payload', () => {
    const result = normalizeSpinePayload({
      agent_id: 'agt_1',
      action: 'scan',
      input: { prompt: 'hello' },
      context: { source: 'test' },
    });

    expect(result.agentId).toBe('agt_1');
    expect(result.action).toBe('scan');
    expect(result.input).toEqual({ prompt: 'hello' });
    expect(result.context).toEqual({ source: 'test' });
    expect(result.canonicalRequest).toEqual({
      action: 'scan',
      input: { prompt: 'hello' },
      context: { source: 'test' },
    });
  });

  it('normalizes nested intent envelope', () => {
    const result = normalizeSpinePayload({
      agent_id: 'agt_2',
      intent: {
        action: 'trade',
        input: { amount: 100 },
        context: { market: 'BTC' },
      },
    });

    expect(result.agentId).toBe('agt_2');
    expect(result.action).toBe('trade');
    expect(result.input).toEqual({ amount: 100 });
  });

  it('defaults action to "scan" when missing', () => {
    const result = normalizeSpinePayload({ agent_id: 'agt_3', input: {} });
    expect(result.action).toBe('scan');
  });

  it('returns empty agentId for null body', () => {
    const result = normalizeSpinePayload(null);
    expect(result.agentId).toBe('');
  });

  it('strips non-canonical values', () => {
    const result = normalizeSpinePayload({
      agent_id: 'agt_4',
      action: 'test',
      input: { valid: 'yes', fn: undefined },
      context: {},
    });
    expect(result.input).toEqual({ valid: 'yes' });
  });
});
