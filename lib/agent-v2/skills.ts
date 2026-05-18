export type ChatbotSkillContext = {
  origin: string;
  orgId: string;
  authHeader: string;
  cookieHeader: string;
};

export type ChatbotSkillStep = {
  id: string;
  toolId: string;
  toolName: string;
  run: (context: ChatbotSkillContext) => Promise<unknown>;
};

export function extractAgentId(text: string) {
  const uuid = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuid) return uuid[0];

  const prefixed = text.match(/agt_[a-zA-Z0-9_-]+/);
  return prefixed ? prefixed[0] : '';
}

export function extractQuotedText(text: string) {
  const match = text.match(/["“”']([^"“”']{1,200})["“”']/);
  return match ? match[1].trim() : '';
}

export function cleanChatMessage(text: string) {
  const quoted = extractQuotedText(text);
  if (quoted) return quoted;

  const cleaned = text
    .replace(/chatbot|chat bot|แชทบอท|แชตบอท|ถามบอท|คุยกับบอท/gi, '')
    .trim();

  return cleaned || text.trim();
}

async function callJson(context: ChatbotSkillContext, path: string, init?: RequestInit) {
  const response = await fetch(`${context.origin}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: context.authHeader,
      cookie: context.cookieHeader,
    },
    cache: 'no-store',
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = typeof json === 'object' && json && 'error' in json
      ? String((json as { error?: unknown }).error)
      : `Tool call failed (${path})`;
    throw new Error(error);
  }

  return json;
}

function postJson(context: ChatbotSkillContext, path: string, body?: unknown) {
  return callJson(context, path, {
    method: 'POST',
    body: JSON.stringify(body || {}),
  });
}

export const chatbotSkills = {
  readiness(): ChatbotSkillStep {
    return {
      id: 's1',
      toolId: 'readiness_v2',
      toolName: 'Check System Readiness',
      run: (context) => callJson(context, '/api/readiness'),
    };
  },

  listAgents(id = 's1'): ChatbotSkillStep {
    return {
      id,
      toolId: 'list_agents_v2',
      toolName: 'List Agents',
      run: (context) => callJson(context, '/api/agents'),
    };
  },

  listPolicies(id = 's1'): ChatbotSkillStep {
    return {
      id,
      toolId: 'list_policies_v2',
      toolName: 'List Policies',
      run: (context) => callJson(context, '/api/policies'),
    };
  },

  listExecutions(id = 's1', limit = 10): ChatbotSkillStep {
    return {
      id,
      toolId: 'list_executions_v2',
      toolName: 'List Executions',
      run: (context) => callJson(context, `/api/executions?limit=${encodeURIComponent(String(limit))}`),
    };
  },

  auditEvents(id = 's1', limit = 20): ChatbotSkillStep {
    return {
      id,
      toolId: 'audit_events_v2',
      toolName: 'Get Audit Events',
      run: (context) => callJson(context, `/api/audit?limit=${encodeURIComponent(String(limit))}`),
    };
  },

  runtimeSummary(agentId: string, id = 's1'): ChatbotSkillStep {
    return {
      id,
      toolId: 'runtime_summary_v2',
      toolName: 'Get Runtime Audit Summary',
      run: (context) =>
        callJson(
          context,
          `/api/runtime-summary?org_id=${encodeURIComponent(context.orgId)}&agent_id=${encodeURIComponent(agentId)}`,
        ),
    };
  },

  runtimeRecovery(agentId: string, id = 's2'): ChatbotSkillStep {
    return {
      id,
      toolId: 'runtime_recovery_v2',
      toolName: 'Validate Runtime Recovery',
      run: (context) =>
        postJson(context, '/api/runtime-recovery', {
          org_id: context.orgId,
          agent_id: agentId,
        }),
    };
  },

  createAgent(name: string, monthlyLimit = 10000, id = 's1'): ChatbotSkillStep {
    return {
      id,
      toolId: 'create_agent_v2',
      toolName: 'Create New Agent',
      run: (context) =>
        postJson(context, '/api/agents', {
          name: name || 'New Agent',
          monthly_limit: monthlyLimit,
        }),
    };
  },

  createChatbotAgent(name: string, monthlyLimit = 50000, id = 's2'): ChatbotSkillStep {
    return {
      id,
      toolId: 'create_chatbot_agent_v2',
      toolName: 'Create Chatbot Agent',
      run: (context) =>
        postJson(context, '/api/agents', {
          name: name || 'Chatbot Agent',
          monthly_limit: monthlyLimit,
        }),
    };
  },

  chatbotMessage(agentId: string, message: string, id = 's1'): ChatbotSkillStep {
    return {
      id,
      toolId: 'chatbot_message_v2',
      toolName: 'Chat with Chatbot Agent',
      run: (context) =>
        postJson(context, '/api/mcp/call', {
          agent_id: agentId,
          action: 'chatbot.message',
          payload: { message },
          tool_name: 'chatbot_message_v2',
        }),
    };
  },

  autoSetup(id = 's2'): ChatbotSkillStep {
    return {
      id,
      toolId: 'auto_setup_v2',
      toolName: 'Run Org Auto Setup',
      run: (context) => postJson(context, '/api/setup/auto'),
    };
  },
};

export function planChatbotSkills(message: string): ChatbotSkillStep[] {
  const text = message.trim();
  const lower = text.toLowerCase();
  const agentId = extractAgentId(text);

  if (/readiness|health|status|สถานะ/.test(lower)) {
    return [chatbotSkills.readiness()];
  }

  if (/audit|lineage|ตรวจสอบ/.test(lower)) {
    if (agentId) {
      return [
        chatbotSkills.runtimeSummary(agentId, 's1'),
        chatbotSkills.runtimeRecovery(agentId, 's2'),
      ];
    }

    return [
      chatbotSkills.auditEvents('s1'),
      chatbotSkills.listExecutions('s2'),
    ];
  }

  if (/chatbot|chat bot|แชทบอท|แชตบอท/.test(lower)) {
    if (/create|สร้าง|new|เพิ่ม/.test(lower) || !agentId) {
      return [
        chatbotSkills.listPolicies('s1'),
        chatbotSkills.createChatbotAgent(extractQuotedText(text) || 'Chatbot Agent', 50000, 's2'),
        chatbotSkills.listAgents('s3'),
      ];
    }

    return [chatbotSkills.chatbotMessage(agentId, cleanChatMessage(text), 's1')];
  }

  if (/create agent|สร้างเอเจนต์|new agent/.test(lower)) {
    return [chatbotSkills.createAgent(extractQuotedText(text) || 'New Agent')];
  }

  if (/agent|เอเจนต์|api เอเจ้น|api agent/.test(lower)) {
    return [chatbotSkills.listAgents()];
  }

  if (/auto_setup|auto setup|setup|ติดตั้ง/.test(lower)) {
    return [chatbotSkills.readiness(), chatbotSkills.autoSetup('s2')];
  }

  return [chatbotSkills.readiness(), chatbotSkills.listAgents('s2')];
}
