import type { AgentStep } from './types';

export function planMessage(message: string): AgentStep[] {
  if (!message.trim()) return [];

  return [
    {
      step_index: 0,
      tool: 'readiness',
      params: { message },
      policy_mode: 'allow',
      status: 'pending',
    },
  ];
}
