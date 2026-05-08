export type OpenAIAdapterStatus = {
  configured: boolean;
  status: 'configured' | 'missing_env';
  baseUrl: string;
  model: string;
  requiredEnv: string[];
  optionalEnv: string[];
  truthBoundary: string;
};

export type OpenAIChatMessage = {
  role: 'system' | 'developer' | 'user' | 'assistant';
  content: string;
};

export type OpenAIAdapterInput = {
  input?: string;
  messages?: OpenAIChatMessage[];
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
};

export type OpenAIAdapterOutput = {
  provider: 'openai';
  model: string;
  outputText: string;
  responseId?: string;
  usage?: unknown;
};

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4.1-mini';

export function getOpenAIAdapterStatus(): OpenAIAdapterStatus {
  const configured = Boolean(process.env.OPENAI_API_KEY?.trim());
  return {
    configured,
    status: configured ? 'configured' : 'missing_env',
    baseUrl: process.env.OPENAI_API_BASE?.trim() || DEFAULT_BASE_URL,
    model: process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
    requiredEnv: ['OPENAI_API_KEY'],
    optionalEnv: ['OPENAI_API_BASE', 'OPENAI_MODEL'],
    truthBoundary: configured
      ? 'OpenAI adapter is configured server-side. The API key must never be exposed to client code.'
      : 'OPENAI_API_KEY is missing from the server environment. Adapter calls are blocked until the key exists in Vercel or the runtime environment.',
  };
}

function normalizeMessages(input: OpenAIAdapterInput): OpenAIChatMessage[] {
  if (input.messages?.length) return input.messages.filter((message) => message.content.trim());
  const text = input.input?.trim();
  if (!text) throw new Error('OPENAI_INPUT_REQUIRED');
  return [{ role: 'user', content: text }];
}

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const record = payload as Record<string, unknown>;
  if (typeof record.output_text === 'string') return record.output_text;

  const output = record.output;
  if (!Array.isArray(output)) return '';

  const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== 'object') continue;
      const text = (contentItem as Record<string, unknown>).text;
      if (typeof text === 'string') parts.push(text);
    }
  }
  return parts.join('\n').trim();
}

export async function runOpenAIAdapter(input: OpenAIAdapterInput): Promise<OpenAIAdapterOutput> {
  const status = getOpenAIAdapterStatus();
  if (!status.configured) throw new Error('OPENAI_API_KEY_MISSING');

  const messages = normalizeMessages(input);
  const model = input.model?.trim() || status.model;
  const maxOutputTokens = Math.min(Math.max(input.maxOutputTokens ?? 800, 1), 4096);
  const temperature = typeof input.temperature === 'number' ? input.temperature : 0.2;

  const response = await fetch(`${status.baseUrl.replace(/\/$/, '')}/responses`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: messages.map((message) => ({ role: message.role, content: message.content })),
      max_output_tokens: maxOutputTokens,
      temperature,
    }),
  });

  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    const error = payload?.error;
    const message = error && typeof error === 'object' && typeof (error as Record<string, unknown>).message === 'string'
      ? (error as Record<string, string>).message
      : `OPENAI_HTTP_${response.status}`;
    throw new Error(message);
  }

  const outputText = extractOutputText(payload);
  return {
    provider: 'openai',
    model,
    outputText,
    responseId: typeof payload?.id === 'string' ? payload.id : undefined,
    usage: payload?.usage,
  };
}
