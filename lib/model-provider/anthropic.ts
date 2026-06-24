/**
 * Anthropic Claude Provider for DSG Control Plane
 * Adds Claude Sonnet 4.5 / Claude Opus 4 as failover for planning + reasoning intents.
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
