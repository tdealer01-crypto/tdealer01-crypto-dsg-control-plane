import { AGENT_TOOLS, getAgentTool } from './tools';

export type PlanStep = {
  id: string;
  toolId: string;
  title: string;
  params: Record<string, unknown>;
};

export type AgentPlan = {
  goal: string;
  steps: PlanStep[];
};

function extractAgentId(message: string): string | null {
  const match = message.match(/agt_[a-zA-Z0-9]+/);
  return match ? match[0] : null;
}

export function planGoal(message: string): AgentPlan {
  const normalized = message.toLowerCase();
  const agentId = extractAgentId(message);

  if (normalized.includes('policy') && (normalized.includes('create') || normalized.includes('new'))) {
    return {
      goal: message,
      steps: [
        {
          id: 'step-1',
          toolId: 'create_policy',
          title: 'Create runtime policy draft',
          params: {
            name: 'Agent policy draft',
            version: 'v1',
            status: 'draft',
            governance_state: 'proposed',
            thresholds: {},
          },
        },
      ],
    };
  }

  if (normalized.includes('execute') || normalized.includes('run')) {
    return {
      goal: message,
      steps: [
        {
          id: 'step-1',
          toolId: 'submit_intent',
          title: 'Submit runtime intent',
          params: {
            agent_id: agentId,
            intent: {
              action: 'agent-chat-action',
              payload: { prompt: message },
            },
          },
        },
        {
          id: 'step-2',
          toolId: 'execute_action',
          title: 'Execute approved runtime action',
          params: {
            agent_id: agentId,
            action: 'agent-chat-action',
            input: { prompt: message },
            context: { source: 'agent-chat' },
          },
        },
      ],
    };
  }

  if (normalized.includes('recovery') || normalized.includes('checkpoint')) {
    return {
      goal: message,
      steps: [
        {
          id: 'step-1',
          toolId: 'validate_recovery',
          title: 'Validate runtime recovery state',
          params: {
            agent_id: agentId,
          },
        },
      ],
    };
  }

  const listToolId = normalized.includes('policy') ? 'list_policies' : 'list_agents';
  const tool = getAgentTool(listToolId) || AGENT_TOOLS[0];

  return {
    goal: message,
    steps: [
      {
        id: 'step-1',
        toolId: tool.id,
        title: `Inspect ${tool.title.toLowerCase()}`,
        params: {},
      },
    ],
  };
}
