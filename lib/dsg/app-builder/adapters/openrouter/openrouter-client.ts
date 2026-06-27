import type { OpenRouterCallInput, OpenRouterCallResult } from './types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openrouter/free';
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.2;

function splitModels(value?: string): string[] {
  return (value || '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
}

function candidateModels(input: OpenRouterCallInput): string[] {
  const primary = input.model || process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const fallbacks = input.fallbackModels?.length
    ? input.fallbackModels
    : splitModels(process.env.OPENROUTER_FALLBACK_MODELS);
  return Array.from(new Set([primary, ...fallbacks].map((model) => model.trim()).filter(Boolean)));
}

function requireApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY_REQUIRED');
  return apiKey;
}

function readUsage(raw: Record<string, unknown>) {
  const usage = raw.usage as Record<string, unknown> | undefined;
  if (!usage) return undefined;
  return {
    promptTokens: typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : undefined,
    completionTokens: typeof usage.completion_tokens === 'number' ? usage.completion_tokens : undefined,
    totalTokens: typeof usage.total_tokens === 'number' ? usage.total_tokens : undefined,
  };
}

export async function callOpenRouter(input: OpenRouterCallInput): Promise<OpenRouterCallResult> {
  let apiKey: string;
  try {
    apiKey = requireApiKey();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OPENROUTER_API_KEY_REQUIRED';
    return { ok: false, error: { code: message, message }, attempts: [] };
  }

  if (!input.messages.length) {
    return { ok: false, error: { code: 'OPENROUTER_MESSAGES_REQUIRED', message: 'At least one message is required.' }, attempts: [] };
  }

  const attempts: Array<{ model: string; status?: number; error?: string }> = [];
  const models = candidateModels(input);

  for (const model of models) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
          'http-referer': process.env.OPENROUTER_SITE_URL || 'https://dsg-one-v1.vercel.app',
          'x-title': process.env.OPENROUTER_APP_TITLE || 'DSG One App Builder',
        },
        body: JSON.stringify({
          model,
          messages: input.messages,
          temperature: input.temperature ?? DEFAULT_TEMPERATURE,
          max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
        }),
      });

      attempts.push({ model, status: response.status });
      const text = await response.text();
      const data = text ? JSON.parse(text) as Record<string, unknown> : {};

      if (!response.ok) continue;

      const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
      const content = choices?.[0]?.message?.content;
      if (!content) {
        attempts[attempts.length - 1] = { model, status: response.status, error: 'OPENROUTER_EMPTY_CONTENT' };
        continue;
      }

      return {
        ok: true,
        model,
        content,
        attempts: attempts.map((attempt) => ({ model: attempt.model, status: attempt.status ?? 0 })),
        usage: readUsage(data),
      };
    } catch (error) {
      attempts.push({ model, error: error instanceof Error ? error.message : 'OPENROUTER_CALL_FAILED' });
    }
  }

  return {
    ok: false,
    error: { code: 'OPENROUTER_ALL_MODELS_FAILED', message: 'All configured OpenRouter models failed or were rate limited.' },
    attempts,
  };
}
