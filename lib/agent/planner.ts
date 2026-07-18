import type { AgentPlan, AgentPlanStep } from './context';

const UUID_PATTERN = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}';

export function extractAgentId(message: string) {
  const match = message.match(new RegExp(`\\b(?:agt_[a-zA-Z0-9_-]+|${UUID_PATTERN})\\b`));
  return match ? match[0] : '';
}

function extractEffectId(message: string) {
  const match = message.match(/eff_[a-zA-Z0-9_-]+/);
  return match ? match[0] : '';
}

function extractQuotedName(message: string) {
  const match = message.match(/["“”']([^"“”']{2,80})["“”']/);
  return match ? match[1].trim() : '';
}

function extractUrl(message: string) {
  const match = message.match(/https?:\/\/[^\s)]+/i);
  return match ? match[0] : '';
}

function nextStep(id: number, toolId: string, params: Record<string, unknown>): AgentPlanStep {
  return { id: `s${id}`, toolId, params };
}

function missingAgentPlan(): AgentPlan {
  return {
    steps: [
      nextStep(1, 'readiness', {}),
      nextStep(2, 'list_agents', {}),
    ],
  };
}

function withAgentId(agentId: string, build: (agentId: string) => AgentPlan): AgentPlan {
  if (!agentId) {
    return missingAgentPlan();
  }
  return build(agentId);
}

export function planGoal(message: string, pageContext?: string): AgentPlan {
  const text = message.trim();
  const lower = text.toLowerCase();
  const agentId = extractAgentId(text);

  if (/^(help|suggest)$/i.test(lower)) {
    switch (pageContext) {
      case '/dashboard/agents':
        return { steps: [nextStep(1, 'list_agents', {})] };
      case '/dashboard/policies':
        return { steps: [nextStep(1, 'list_policies', {})] };
      case '/dashboard/billing':
      case '/dashboard/capacity':
        return { steps: [nextStep(1, 'capacity', {})] };
      case '/dashboard/executions':
      case '/dashboard/operations':
        return withAgentId(agentId, (id) => ({
          steps: [
            nextStep(1, 'audit_summary', { agent_id: id }),
            nextStep(2, 'recovery_validate', { agent_id: id }),
          ],
        }));
      default:
        return { steps: [nextStep(1, 'readiness', {})] };
    }
  }

  if (/readiness|health|status/.test(lower)) {
    return { steps: [nextStep(1, 'readiness', {})] };
  }

  if (/execute|run/.test(lower)) {
    return withAgentId(agentId, (id) => ({
      steps: [
        nextStep(1, 'readiness', {}),
        nextStep(2, 'execute_action', { agent_id: id, action: 'operator-request', payload: { message: text } }),
      ],
    }));
  }

  if (/audit|lineage/.test(lower)) {
    return withAgentId(agentId, (id) => ({
      steps: [
        nextStep(1, 'audit_summary', { agent_id: id }),
        nextStep(2, 'recovery_validate', { agent_id: id }),
      ],
    }));
  }

  if (/checkpoint/.test(lower)) {
    return withAgentId(agentId, (id) => ({
      steps: [
        nextStep(1, 'recovery_validate', { agent_id: id }),
        nextStep(2, 'checkpoint', { agent_id: id }),
      ],
    }));
  }

  if (/execution|executions|proof|replay/.test(lower)) {
    const executionId = text.match(/exec_[a-zA-Z0-9_-]+/)?.[0] || '';
    if (executionId) {
      return { steps: [nextStep(1, 'get_execution_proof', { execution_id: executionId })] };
    }

    if (/proof/.test(lower)) {
      return { steps: [nextStep(1, 'list_proofs', {})] };
    }

    return { steps: [nextStep(1, 'list_executions', {})] };
  }

  if (/ledger/.test(lower)) {
    return { steps: [nextStep(1, 'get_ledger', {})] };
  }

  if (/usage|billing|plan/.test(lower)) {
    return {
      steps: [
        nextStep(1, 'get_usage', {}),
        nextStep(2, 'capacity', {}),
      ],
    };
  }

  if (/metric|latency|allow rate|block rate/.test(lower)) {
    return { steps: [nextStep(1, 'get_metrics', {})] };
  }

  if (/integration/.test(lower)) {
    return { steps: [nextStep(1, 'get_integration', {})] };
  }

  if (/quota|capacity/.test(lower)) {
    return { steps: [nextStep(1, 'capacity', {})] };
  }

  if (/browser|navigate|open url/.test(lower)) {
    return withAgentId(agentId, (id) => ({
      steps: [nextStep(1, 'browser_navigate', { agent_id: id, url: extractUrl(text), extract: '' })],
    }));
  }

  if (/search|online|web/.test(lower)) {
    return {
      steps: [nextStep(1, 'realtime_web_search', { query: text })],
    };
  }

  if (/list agents|show agents|agents/.test(lower)) {
    return { steps: [nextStep(1, 'list_agents', {})] };
  }

  if (/policy/.test(lower)) {
    return { steps: [nextStep(1, 'list_policies', {})] };
  }

  if (/effect|reconcile/.test(lower)) {
    return {
      steps: [
        nextStep(1, 'reconcile_effect', {
          effect_id: extractEffectId(text),
          status: /fail|failed|error/.test(lower) ? 'failed' : 'succeeded',
        }),
      ],
    };
  }

  if (/create agent|new agent/.test(lower)) {
    return {
      steps: [
        nextStep(1, 'create_agent', {
          name: extractQuotedName(text) || 'New Agent',
          policy_id: null,
        }),
      ],
    };
  }

  if (/agent detail/.test(lower)) {
    return withAgentId(agentId, (id) => ({ steps: [nextStep(1, 'get_agent_detail', { agent_id: id })] }));
  }

  if (/rotate key|rotate api key/.test(lower)) {
    return withAgentId(agentId, (id) => ({ steps: [nextStep(1, 'rotate_agent_key', { agent_id: id })] }));
  }

  if (/delete agent|disable agent/.test(lower)) {
    return withAgentId(agentId, (id) => ({ steps: [nextStep(1, 'delete_agent', { agent_id: id })] }));
  }

  if (/compliance|ccvs|mutation score|claim gate/.test(lower)) {
    return { steps: [nextStep(1, 'get_compliance_status', {})] };
  }

  if (/delivery proof|proof scan|scan production|สแกน|ดีลิเวอรี่/.test(lower)) {
    return { steps: [nextStep(1, 'get_delivery_proof', {})] };
  }

  if (/รัน|run code|execute code|python|node\.?js|bash script/.test(lower)) {
    const isNode = /node|javascript|js/.test(lower);
    const isPython = /python/.test(lower);
    const runtime = isPython ? 'python3' : isNode ? 'node' : 'bash';
    return {
      steps: [nextStep(1, 'run_code', { runtime, code: '' })],
    };
  }

  if (/fetch|ดึงข้อมูล url|ดึง url|อ่าน url/.test(lower)) {
    return {
      steps: [nextStep(1, 'fetch_url', { url: extractUrl(text) })],
    };
  }

  if (/chatbot|chat bot/.test(lower)) {
    return {
      steps: [
        nextStep(1, 'list_policies', {}),
        nextStep(2, 'create_chatbot_agent', {
          name: extractQuotedName(text) || 'Chatbot Agent',
          policy_id: null,
          monthly_limit: 50000,
        }),
        nextStep(3, 'list_agents', {}),
      ],
    };
  }

  return {
    steps: [
      nextStep(1, 'readiness', {}),
      nextStep(2, 'list_agents', {}),
    ],
  };
}
