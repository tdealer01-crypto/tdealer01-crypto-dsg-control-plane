import type { AgentPlan, AgentPlanStep } from './context';
import { DSG_TOOLS } from './tools';

type ModelSpec = {
  id: string;
  openRouterId: string;
  strengths: string[];
  maxTokens: number;
};

const FREE_MODELS: ModelSpec[] = [
  {
    id: 'qwen-planner',
    openRouterId: 'qwen/qwen-2.5-7b-instruct:free',
    strengths: ['planning', 'tool-selection', 'thai'],
    maxTokens: 2048,
  },
  {
    id: 'deepseek-reasoner',
    openRouterId: 'deepseek/deepseek-r1-0528:free',
    strengths: ['reasoning', 'analysis', 'audit', 'proof'],
    maxTokens: 4096,
  },
  {
    id: 'llama-chat',
    openRouterId: 'meta-llama/llama-4-scout:free',
    strengths: ['chat', 'summary', 'explain', 'help'],
    maxTokens: 2048,
  },
  {
    id: 'qwen-coder',
    openRouterId: 'qwen/qwen-2.5-coder-7b-instruct:free',
    strengths: ['code', 'json', 'config', 'technical'],
    maxTokens: 2048,
  },
];

export type MemoryEntry = {
  role: 'user' | 'assistant' | 'tool_result';
  content: string;
  model_id?: string;
  page_context?: string;
  timestamp: number;
};

// In-memory only (best effort on serverless/warm instances).
const memoryStore = new Map<string, MemoryEntry[]>();
const MAX_MEMORY = 50;
const SESSION_TTL_MS = 30 * 60 * 1000;

type Intent = 'planning' | 'reasoning' | 'chat' | 'code';

export function getMemory(sessionKey: string): MemoryEntry[] {
  return memoryStore.get(sessionKey) || [];
}

export function addMemory(sessionKey: string, entry: MemoryEntry) {
  const mem = memoryStore.get(sessionKey) || [];
  mem.push(entry);

  if (mem.length > MAX_MEMORY) {
    memoryStore.set(sessionKey, mem.slice(-MAX_MEMORY));
    return;
  }

  memoryStore.set(sessionKey, mem);
  cleanupStaleSessions(entry.timestamp);
}

function cleanupStaleSessions(now: number) {
  for (const [key, entries] of memoryStore.entries()) {
    const lastEntry = entries.at(-1);
    if (!lastEntry) {
      memoryStore.delete(key);
      continue;
    }

    if (now - lastEntry.timestamp > SESSION_TTL_MS) {
      memoryStore.delete(key);
    }
  }
}

function classifyIntent(message: string): Intent {
  const lower = message.toLowerCase();

  if (/json|config|policy.*create|schema|sql|code|โค้ด|สคริปต์/.test(lower)) {
    return 'code';
  }

  if (/why|ทำไม|วิเคราะห์|analyze|audit|proof|compare|เปรียบเทียบ|อธิบาย|explain/.test(lower)) {
    return 'reasoning';
  }

  if (/^(hi|hello|สวัสดี|ช่วย|help|แนะนำ|อะไร|what|how|ยังไง|เล่า|tell)/.test(lower)) {
    return 'chat';
  }

  return 'planning';
}

function selectModel(intent: Intent): ModelSpec {
  switch (intent) {
    case 'code':
      return FREE_MODELS.find((model) => model.id === 'qwen-coder')!;
    case 'reasoning':
      return FREE_MODELS.find((model) => model.id === 'deepseek-reasoner')!;
    case 'chat':
      return FREE_MODELS.find((model) => model.id === 'llama-chat')!;
    case 'planning':
    default:
      return FREE_MODELS.find((model) => model.id === 'qwen-planner')!;
  }
}

function buildSystemPrompt(pageContext?: string): string {
  const toolList = DSG_TOOLS.map((tool) => `- ${tool.id}: ${tool.description} [${tool.riskLevel}]`).join('\n');

  return `You are DSG Agent — an AI assistant for the DSG Control Plane.
You help users manage agents, executions, policies, billing, and audit.

Available tools:
${toolList}

Current page: ${pageContext || 'unknown'}

Respond with a JSON object:
{
  "reply": "natural language response to user (Thai or English, match user language)",
  "plan": {
    "steps": [
      { "id": "s1", "toolId": "tool_id_here", "params": {} }
    ]
  }
}

If no tool is needed (just chatting), return empty steps: "steps": []
Always include "reply" with a helpful message.`;
}

function buildMessages(
  sessionKey: string,
  message: string,
  pageContext?: string,
): Array<{ role: string; content: string }> {
  const memory = getMemory(sessionKey);
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: buildSystemPrompt(pageContext) },
  ];

  const recentMemory = memory.slice(-20);
  for (const entry of recentMemory) {
    messages.push({
      role: entry.role === 'tool_result' ? 'assistant' : entry.role,
      content: entry.content,
    });
  }

  messages.push({ role: 'user', content: message });
  return messages;
}

function toPlanSteps(value: unknown): AgentPlanStep[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((step, index) => {
    const item = step && typeof step === 'object' ? (step as Record<string, unknown>) : {};
    const params = item.params && typeof item.params === 'object' ? (item.params as Record<string, unknown>) : {};

    return {
      id: typeof item.id === 'string' && item.id ? item.id : `s${index + 1}`,
      toolId: typeof item.toolId === 'string' ? item.toolId : '',
      params,
    };
  });
}

async function callOpenRouter(
  model: ModelSpec,
  messages: Array<{ role: string; content: string }>,
): Promise<{ reply: string; plan: AgentPlan }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not set');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  let response: Response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'https://tdealer01-crypto-dsg-control-plane.vercel.app',
        'X-Title': 'DSG Control Plane',
      },
      body: JSON.stringify({
        model: model.openRouterId,
        messages,
        max_tokens: model.maxTokens,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error(`OpenRouter ${model.id} timeout after 15000ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`OpenRouter ${model.id} error: ${response.status} ${err}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content || '';

  try {
    const parsed = JSON.parse(content) as {
      reply?: unknown;
      plan?: { steps?: unknown };
    };

    return {
      reply: String(parsed.reply || ''),
      plan: {
        steps: toPlanSteps(parsed.plan?.steps),
      },
    };
  } catch {
    return { reply: content, plan: { steps: [] } };
  }
}

export async function routeToModel(
  sessionKey: string,
  message: string,
  pageContext?: string,
): Promise<{
  reply: string;
  plan: AgentPlan;
  modelUsed: string;
  intent: Intent;
}> {
  const intent = classifyIntent(message);
  const model = selectModel(intent);
  const messages = buildMessages(sessionKey, message, pageContext);

  addMemory(sessionKey, {
    role: 'user',
    content: message,
    page_context: pageContext,
    timestamp: Date.now(),
  });

  const result = await callOpenRouter(model, messages);

  addMemory(sessionKey, {
    role: 'assistant',
    content: result.reply,
    model_id: model.id,
    timestamp: Date.now(),
  });

  return {
    ...result,
    modelUsed: model.id,
    intent,
  };
}

export function addToolResultToMemory(
  sessionKey: string,
  toolId: string,
  result: unknown,
) {
  addMemory(sessionKey, {
    role: 'tool_result',
    content: `[Tool: ${toolId}] ${JSON.stringify(result).slice(0, 500)}`,
    timestamp: Date.now(),
  });
}
