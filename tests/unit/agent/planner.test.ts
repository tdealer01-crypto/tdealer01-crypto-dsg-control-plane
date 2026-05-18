import { describe, expect, it } from 'vitest';
import { planGoal } from '../../../lib/agent/planner';

describe('agent planner chatbot intents', () => {
  it('creates chatbot agent plan from thai prompt', () => {
    const plan = planGoal('ช่วยเพิ่มแชทบอทเอเจ้นตามแผนได้');
    expect(plan.steps.map((step) => step.toolId)).toEqual(['list_policies', 'create_chatbot_agent', 'list_agents']);
    expect(plan.steps[1]?.params).toMatchObject({ name: 'Chatbot Agent', monthly_limit: 50000 });
  });

  it('uses quoted name when provided', () => {
    const plan = planGoal('create chatbot agent "Finance Helper"');
    expect(plan.steps[1]?.params).toMatchObject({ name: 'Finance Helper' });
  });

  it('routes online search prompts to realtime web search tool', () => {
    const plan = planGoal('ค้นหาข่าว bitcoin online ตอนนี้');
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]?.toolId).toBe('realtime_web_search');
    expect(plan.steps[0]?.params).toMatchObject({ query: 'ค้นหาข่าว bitcoin online ตอนนี้' });
  });

  it('routes browser control prompt to browser navigate tool', () => {
    const plan = planGoal('เปิดเว็บ https://example.com ด้วย browser ให้หน่อย agt_ops_01');
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]?.toolId).toBe('browser_navigate');
    expect(plan.steps[0]?.params).toMatchObject({
      agent_id: 'agt_ops_01',
      url: 'https://example.com',
    });
  });


  it('uses page context for help prompt', () => {
    const plan = planGoal('help', '/dashboard/policies');
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]?.toolId).toBe('list_policies');
  });

  it('routes execution intent to list executions and replay tools', () => {
    const listPlan = planGoal('show executions');
    expect(listPlan.steps[0]?.toolId).toBe('list_executions');

    const replayPlan = planGoal('show proof exec_abc123');
    expect(replayPlan.steps[0]?.toolId).toBe('get_execution_proof');
    expect(replayPlan.steps[0]?.params).toMatchObject({ execution_id: 'exec_abc123' });
  });

});
