// Customer-facing DSG Assistant endpoint.
// Provider order: OpenAI -> NVIDIA. If both are unavailable, fail closed with 503.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are DSG Assistant, a concise product assistant for DSG ONE.
Explain only verified product concepts: AI governance, deterministic gates, PASS/REVIEW/BLOCK outcomes, audit evidence, and how customers get started.
Do not invent production status, proof IDs, prices, trial terms, provider status, or compliance certification.
If a requested fact is not available in the prompt or product configuration, say it is not verified.
Support Thai and English.`;

type Provider = 'openai' | 'nvidia';

type ProviderResult = {
  provider: Provider;
  model: string;
  content: string;
};

function extractMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const record = body as Record<string, unknown>;

  if (typeof record.message === 'string') {
    return record.message.trim();
  }

  if (Array.isArray(record.messages)) {
    for (let i = record.messages.length - 1; i >= 0; i -= 1) {
      const item = record.messages[i];
      if (
        item &&
        typeof item === 'object' &&
        (item as Record<string, unknown>).role === 'user' &&
        typeof (item as Record<string, unknown>).content === 'string'
      ) {
        return ((item as Record<string, unknown>).content as string).trim();
      }
    }
  }

  return '';
}

async function callOpenAI(message: string): Promise<ProviderResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL_CHAT || 'gpt-5-mini';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      console.warn(`[try/chat] OpenAI ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    return { provider: 'openai', model, content };
  } catch (error) {
    console.warn('[try/chat] OpenAI unavailable:', error);
    return null;
  }
}

async function callNvidia(message: string): Promise<ProviderResult | null> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;

  const model = process.env.NVIDIA_MODEL_CHAT || 'nvidia/nemotron-3-ultra-550b-a55b';

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        max_tokens: 700,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      console.warn(`[try/chat] NVIDIA ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    return { provider: 'nvidia', model, content };
  } catch (error) {
    console.warn('[try/chat] NVIDIA unavailable:', error);
    return null;
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const message = extractMessage(body);

  if (!message) {
    return NextResponse.json(
      { ok: false, error: 'message is required' },
      { status: 400 },
    );
  }

  const result = (await callOpenAI(message)) ?? (await callNvidia(message));

  if (!result) {
    return NextResponse.json(
      {
        ok: false,
        error: 'DSG Assistant is temporarily unavailable because no configured live AI provider returned a valid response.',
        meta: { mode: 'unavailable' },
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    reply: result.content,
    timestamp: new Date().toISOString(),
    meta: {
      provider: result.provider,
      model: result.model,
      mode: 'llm',
    },
  });
}
