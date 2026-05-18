import type { AgentPlan, AgentPlanStep } from '../agent/context';

export type ModelProviderRequest = {
  orgId: string;
  sessionKey: string;
  message: string;
  pageContext?: string;
  customerApiKey?: string | null;
};

export type ModelProviderResult = {
  reply: string;
  plan: AgentPlan;
  modelUsed: string;
  provider: 'openrouter' | 'fallback-skills-planner';
  keySource: 'customer' | 'system' | 'none';
};

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

function systemPrompt(pageContext?: string) {
  return `You are the DSG Agent planning brain.
Return JSON only with this shape:
{
  "reply": "brief Thai or English response matching the user",
  "plan": { "steps": [{ "id": "s1", "toolId": "readiness", "params": {} }] }
}
Never claim that an action has executed. Write/critical actions are only proposed and must be approved through the runtime gate.
Current page: ${pageContext || 'unknown'}`;
}

export async function callOpenRouterProvider(request: ModelProviderRequest): Promise<ModelProviderResult> {
  const customerApiKey = request.customerApiKey?.trim();
  const systemApiKey = process.env.OPENROUTER_API_KEY?.trim();
  const apiKey = customerApiKey || systemApiKey;

  if (!apiKey) {
    return {
      reply: 'ไม่มี model key ที่ใช้งานได้ จึงใช้ fallback skills planner แทน',
      plan: { steps: [] },
      modelUsed: 'fallback-skills-planner',
      provider: 'fallback-skills-planner',
      keySource: 'none',
    };
  }

  const model = process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-7b-instruct:free';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'https://tdealer01-crypto-dsg-control-plane.vercel.app',
        'X-Title': 'DSG Control Plane',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt(request.pageContext) },
          { role: 'user', content: request.message },
        ],
        max_tokens: 2048,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      throw new Error(`OpenRouter provider error: ${response.status} ${err}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(content) as { reply?: unknown; plan?: { steps?: unknown } };

    return {
      reply: String(parsed.reply || ''),
      plan: { steps: toPlanSteps(parsed.plan?.steps) },
      modelUsed: model,
      provider: 'openrouter',
      keySource: customerApiKey ? 'customer' : 'system',
    };
  } finally {
    clearTimeout(timeout);
  }
}
