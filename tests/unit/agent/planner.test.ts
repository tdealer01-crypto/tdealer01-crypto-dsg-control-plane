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
});
