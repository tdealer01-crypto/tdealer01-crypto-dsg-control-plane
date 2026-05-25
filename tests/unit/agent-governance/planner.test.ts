import { describe, expect, it } from 'vitest';
import { planMessage } from '../../../lib/agent-governance/planner';

describe('planMessage', () => {
  it('returns empty array for empty string', () => {
    expect(planMessage('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(planMessage('   ')).toEqual([]);
    expect(planMessage('\n\t')).toEqual([]);
  });

  it('returns an array with one step for a non-empty message', () => {
    const steps = planMessage('check agent readiness');
    expect(steps).toHaveLength(1);
  });

  it('step has step_index 0', () => {
    expect(planMessage('hello')[0].step_index).toBe(0);
  });

  it('step uses readiness tool', () => {
    expect(planMessage('hello')[0].tool).toBe('readiness');
  });

  it('step passes message in params', () => {
    const msg = 'deploy to production';
    expect(planMessage(msg)[0].params).toEqual({ message: msg });
  });

  it('step has policy_mode allow', () => {
    expect(planMessage('hello')[0].policy_mode).toBe('allow');
  });

  it('step has status pending', () => {
    expect(planMessage('hello')[0].status).toBe('pending');
  });
});
