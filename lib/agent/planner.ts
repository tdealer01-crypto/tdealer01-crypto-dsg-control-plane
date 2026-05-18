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

  if (/^(ช่วย|help|แนะนำ|suggest)$/i.test(lower)) {
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

  if (/readiness|health|status|สถานะ/.test(lower)) {
    return { steps: [nextStep(1, 'readiness', {})] };
  }

  if (/execute|run|รัน|ทำงาน/.test(lower)) {
    return withAgentId(agentId, (id) => ({
      steps: [
        nextStep(1, 'readiness', {}),
        nextStep(2, 'execute_action', { agent_id: id, action: 'operator-request', payload: { message: text } }),
      ],
    }));
  }

  if (/audit|lineage|ตรวจสอบ/.test(lower)) {
    return withAgentId(agentId, (id) => ({
      steps: [
        nextStep(1, 'audit_summary', { agent_id: id }),
        nextStep(2, 'recovery_validate', { agent_id: id }),
      ],
    }));
  }

  if (/checkpoint|บันทึก/.test(lower)) {
    return withAgentId(agentId, (id) => ({
      steps: [
        nextStep(1, 'recovery_validate', { agent_id: id }),
        nextStep(2, 'checkpoint', { agent_id: id }),
      ],
    }));
  }

  if (/execution|executions|proof|replay|หลักฐาน/.test(lower)) {
    const executionId = text.match(/exec_[a-zA-Z0-9_-]+/)?.[0] || '';
    if (executionId) {
      return { steps: [nextStep(1, 'get_execution_proof', { execution_id: executionId })] };
    }

    if (/proof/.test(lower)) {
      return { steps: [nextStep(1, 'list_proofs', {})] };
    }

    return { steps: [nextStep(1, 'list_executions', {})] };
  }

  if (/ledger|บัญชี/.test(lower)) {
    return { steps: [nextStep(1, 'get_ledger', {})] };
  }

  if (/usage|billing|ค่าใช้จ่าย|แพลน|plan/.test(lower)) {
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

  if (/integration|เชื่อมต่อ/.test(lower)) {
    return { steps: [nextStep(1, 'get_integration', {})] };
  }

  if (/quota|capacity|โควต้า/.test(lower)) {
    return { steps: [nextStep(1, 'capacity', {})] };
  }

  if (/browser|navigate|open url|เปิดเว็บ|เปิดลิงก์|เข้าเว็บ/.test(lower)) {
    return withAgentId(agentId, (id) => ({
      steps: [
        nextStep(1, 'browser_navigate', {
          agent_id: id,
          url: extractUrl(text),
          extract: '',
        }),
      ],
    }));
  }

  if (/search|ค้นหา|ออนไลน์|online|เว็บ|web/.test(lower)) {
    return {
      steps: [nextStep(1, 'realtime_web_search', { query: text })],
    };
  }

  if (/list agents|show agents|agents|เอเจนต์ทั้งหมด/.test(lower)) {
    return { steps: [nextStep(1, 'list_agents', {})] };
  }

  if (/policy|นโยบาย/.test(lower)) {
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

  if (/create agent|สร้างเอเจนต์|new agent/.test(lower)) {
    return {
      steps: [
        nextStep(1, 'create_agent', {
          name: extractQuotedName(text) || 'New Agent',
          policy_id: null,
        }),
      ],
    };
  }

  if (/agent detail|รายละเอียดเอเจนต์/.test(lower)) {
    return withAgentId(agentId, (id) => ({ steps: [nextStep(1, 'get_agent_detail', { agent_id: id })] }));
  }

  if (/rotate key|rotate api key/.test(lower)) {
    return withAgentId(agentId, (id) => ({ steps: [nextStep(1, 'rotate_agent_key', { agent_id: id })] }));
  }

  if (/delete agent|disable agent|ลบเอเจนต์/.test(lower)) {
    return withAgentId(agentId, (id) => ({ steps: [nextStep(1, 'delete_agent', { agent_id: id })] }));
  }

  if (/chatbot|chat bot|แชทบอท|แชตบอท/.test(lower)) {
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
