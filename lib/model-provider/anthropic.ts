/**
 * Anthropic Claude Provider for DSG Control Plane
 * Adds Claude Sonnet / Opus as failover for planning + reasoning intents.
 */

export type AnthropicProviderRequest = {
  orgId: string;
  message: string;
  systemContext?: string;
};

export type AnthropicProviderResult = {
  reply: string;
  modelUsed: string;
  provider: 'anthropic';
  stopReason: string;
};

export type AnthropicStructuredToolRequest = {
  message: string;
  system: string;
  toolName: string;
  toolDescription: string;
  inputSchema: Record<string, unknown>;
  model?: string;
  maxTokens?: number;
  temperature?: number;
};

export type AnthropicStructuredToolResult = {
  provider: 'anthropic';
  modelUsed: string;
  responseId?: string;
  stopReason: string;
  input: unknown;
  usage?: unknown;
};

const MODEL_BY_INTENT: Record<string, { model: string; maxTokens: number }> = {
  planning: { model: process.env.ANTHROPIC_MODEL_PLANNING || 'claude-sonnet-4-20250514', maxTokens: 4096 },
  reasoning: { model: process.env.ANTHROPIC_MODEL_REASONING || 'claude-opus-4-20250514', maxTokens: 4096 },
  chat: { model: process.env.ANTHROPIC_MODEL_CHAT || 'claude-sonnet-4-20250514', maxTokens: 2048 },
  code: { model: process.env.ANTHROPIC_MODEL_CODE || 'claude-sonnet-4-20250514', maxTokens: 2048 },
  general: { model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514', maxTokens: 4096 },
};

export async function callAnthropicProvider(request: AnthropicProviderRequest): Promise<AnthropicProviderResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;

  const intent = classifyIntent(request.message);
  const config = MODEL_BY_INTENT[intent] || MODEL_BY_INTENT.general;
  const baseSystem = process.env.ANTHROPIC_SYSTEM_CONTEXT || 'You are a DSG governance agent. Return structured JSON with "reply" and "plan" fields. Never claim actions executed without evidence.';
  const system = request.systemContext
    ? `${baseSystem}\n\nPage context: ${request.systemContext}`
    : baseSystem;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        system,
        messages: [{ role: 'user', content: request.message }],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      console.error(`[anthropic] API error ${response.status}: ${err.slice(0, 200)}`);
      return null;
    }

    const json: any = await response.json();
    const text = json?.content?.[0]?.text || '';
    const stopReason = json?.stop_reason || 'unknown';

    return {
      reply: text.trim(),
      modelUsed: config.model,
      provider: 'anthropic',
      stopReason,
    };
  } catch (err) {
    console.error('[anthropic] request failed:', err);
    return null;
  }
}

/**
 * Call Claude with a forced client-tool schema and return only the tool input.
 * The caller remains responsible for validating that input against real repo state.
 */
export async function callAnthropicStructuredTool(
  request: AnthropicStructuredToolRequest,
): Promise<AnthropicStructuredToolResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY_MISSING');

  const model = request.model?.trim() ||
    process.env.ANTHROPIC_REPAIR_MODEL?.trim() ||
    process.env.ANTHROPIC_MODEL_CODE?.trim() ||
    process.env.ANTHROPIC_MODEL?.trim() ||
    MODEL_BY_INTENT.code.model;
  const maxTokens = Math.min(Math.max(request.maxTokens ?? 4096, 1), 8192);
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(45_000),
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: request.system,
      messages: [{ role: 'user', content: request.message }],
      temperature: typeof request.temperature === 'number' ? request.temperature : 0,
      tools: [{
        name: request.toolName,
        description: request.toolDescription,
        input_schema: request.inputSchema,
      }],
      tool_choice: { type: 'tool', name: request.toolName },
    }),
  });

  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    const error = payload?.error;
    const message = error && typeof error === 'object' && typeof (error as Record<string, unknown>).message === 'string'
      ? String((error as Record<string, unknown>).message)
      : `ANTHROPIC_HTTP_${response.status}`;
    throw new Error(message);
  }

  const content = Array.isArray(payload?.content) ? payload.content : [];
  const toolUse = content.find((item) =>
    item && typeof item === 'object' &&
    (item as Record<string, unknown>).type === 'tool_use' &&
    (item as Record<string, unknown>).name === request.toolName,
  ) as Record<string, unknown> | undefined;
  if (!toolUse || !('input' in toolUse)) throw new Error('ANTHROPIC_STRUCTURED_TOOL_OUTPUT_MISSING');

  return {
    provider: 'anthropic',
    modelUsed: typeof payload?.model === 'string' ? payload.model : model,
    responseId: typeof payload?.id === 'string' ? payload.id : undefined,
    stopReason: typeof payload?.stop_reason === 'string' ? payload.stop_reason : 'unknown',
    input: toolUse.input,
    usage: payload?.usage,
  };
}

function classifyIntent(message: string): string {
  const lower = message.toLowerCase();
  if (/json|config|schema|sql|code|typescript|debug|build|route|decrypt/.test(lower)) return 'code';
  if (/why|audit|compare|explain|prove|verify|proof/.test(lower)) return 'reasoning';
  if (/^(hi|hello|help|what|how|tell|สวัสดี|ขอความช่วยเหลือ)/.test(lower)) return 'chat';
  return 'planning';
}

/**
 * Check if Anthropic provider is available (API key present)
 */
export function hasAnthropicProvider(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}
