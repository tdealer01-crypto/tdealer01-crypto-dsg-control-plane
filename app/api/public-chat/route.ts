import { NextResponse } from 'next/server';
import { logServerError, serverErrorResponse } from '../../../lib/security/error-response';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../lib/security/rate-limit';
import { sendLeadWelcome } from '../../../lib/email/sales';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

const DEMO_URL = '/demo';
const REQUEST_ACCESS_URL = '/request-access';
const PRICING_URL = '/pricing';

const SUGGESTIONS = [
  'View interactive demo',
  'See pricing and choose a plan',
  'View Skills Marketplace',
  'Request a demo or access',
  'Explain DSG Agent and runtime approval',
];

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;
const MAX_MESSAGES = 8;
const MAX_MESSAGE_LENGTH = 1600;
const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4.1-mini';
const SYSTEM_PROMPT =
  'You are DSG Public Assistant for DSG ONE / CospinDSG. Answer in the user language. Be concise, factual, and useful. Explain DSG product value, product usage, audit/enforce modes, pricing/demo/request-access paths, and safe next steps. Public mode must not execute actions, request secrets, or claim production readiness without evidence.';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type Provider = 'openai' | 'openrouter' | 'anthropic' | 'nvidia';

type OpenAITextContent = {
  text?: string;
};

type OpenAIOutputItem = {
  content?: OpenAITextContent[];
};

type OpenAIResponse = {
  output_text?: string;
  output?: OpenAIOutputItem[];
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
    code?: string | number;
    type?: string;
  };
};

type ChatResult = {
  ok: boolean;
  status: number;
  error?: string;
  answer: string;
  mode: 'openai_responses_api' | 'openrouter_chat_completions_api' | 'fallback_public_chat';
  model: string | null;
  provider: Provider | 'fallback';
};

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const HIGH_INTENT_RE = /price|pricing|plan|trial|access|upgrade|buy|purchase/i;

function extractEmail(messages: ChatMessage[]): string | null {
  for (const m of messages) {
    const match = EMAIL_RE.exec(m.content);
    if (match) return match[0].toLowerCase();
  }
  return null;
}

function intentScore(messages: ChatMessage[]): number {
  const text = messages.map((m) => m.content).join(' ');
  let score = 0;
  if (HIGH_INTENT_RE.test(text)) score += 40;
  if (/demo/.test(text)) score += 20;
  if (/agent|runtime|governance/.test(text)) score += 20;
  if (messages.length >= 3) score += 20;
  return Math.min(score, 100);
}

async function captureLead(email: string, messages: ChatMessage[], score: number): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await (supabase as any).from('leads').upsert(
      { email, source: 'public-chat', intent: score >= 40 ? 'high' : 'browse', intent_score: score, messages, last_seen_at: new Date().toISOString() },
      { onConflict: 'email,source' }
    );
    await sendLeadWelcome(email);
  } catch {
    // fire-and-forget
  }
}

function normalizeMessages(body: unknown): ChatMessage[] {
  const candidate = body && typeof body === 'object' ? (body as { messages?: unknown; message?: unknown }) : {};

  if (Array.isArray(candidate.messages)) {
    return candidate.messages
      .filter((message): message is ChatMessage => {
        if (!message || typeof message !== 'object') return false;
        const item = message as Partial<ChatMessage>;
        return (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string';
      })
      .slice(-MAX_MESSAGES)
      .map((message) => ({
        role: message.role,
        content: message.content.slice(0, MAX_MESSAGE_LENGTH),
      }));
  }

  const message = typeof candidate.message === 'string' ? candidate.message.trim() : '';
  return message ? [{ role: 'user', content: message.slice(0, MAX_MESSAGE_LENGTH) }] : [];
}

function formatConversation(messages: ChatMessage[]) {
  return messages
    .map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`)
    .join('\n\n');
}

function isSecretLike(value: string | undefined) {
  if (!value) return false;
  return value.startsWith('sk-') || value.startsWith('sk_') || value.startsWith('sk-or-');
}

function safeModel(value: string | undefined, fallback: string) {
  if (!value || isSecretLike(value)) return fallback;
  return value;
}

function resolveProvider(): Provider | null {
  const requested = (process.env.PUBLIC_CHAT_PROVIDER || process.env.AI_PROVIDER || '').toLowerCase();

  if (requested === 'anthropic') return 'anthropic';
  if (requested === 'openrouter') return 'openrouter';
  if (requested === 'openai') return 'openai';
  if (requested === 'nvidia') return 'nvidia';

  // Auto-detect: OpenRouter first (primary), then others
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.NVIDIA_API_KEY) return 'nvidia';
  return null;
}

function extractOpenAIText(payload: OpenAIResponse): string {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const text = payload.output
    ?.flatMap((item) => item.content || [])
    .map((content) => content.text || '')
    .join('\n')
    .trim();

  return text || 'DSG Assistant did not return text. Please try again.';
}

function extractOpenRouterText(payload: OpenRouterResponse): string {
  const text = payload.choices?.[0]?.message?.content?.trim();
  return text || 'DSG Assistant did not return text. Please try again.';
}

function fallbackReply(message: string) {
  const lower = message.toLowerCase();

  if (/demo|proof/.test(lower)) {
    return `View the demo and buyer proof at ${DEMO_URL}. To try DSG with real access, go to ${REQUEST_ACCESS_URL}.`;
  }

  if (/price|pricing|plan/.test(lower)) {
    return `See pricing and plans at ${PRICING_URL}. To get started, we recommend beginning at ${REQUEST_ACCESS_URL} and opening the dashboard after login.`;
  }

  if (/access|start|signup|sign up/.test(lower)) {
    return `Get started at ${REQUEST_ACCESS_URL} or /signup. If you already have an account, go to /login to open the dashboard and use DSG Agent with full audit/approval.`;
  }

  if (/agent|chatbot|bot/.test(lower)) {
    return `DSG Agent helps you plan, check readiness, and manage agent workflows. View the demo at ${DEMO_URL}. Real actions such as creating an agent or executing a runtime require login and approval gate clearance to maintain a complete audit/ledger.`;
  }

  if (/readiness|health|status/.test(lower)) {
    return 'The public page supports basic health/readiness checks. Deep runtime data requires logging into the dashboard first to protect internal information and maintain the audit trail.';
  }

  return `Hello — I am the DSG public assistant. Ask about DSG Agent, pricing, demo, request access, or how to reach the dashboard. To view the demo now, open ${DEMO_URL}.`;
}

function fallbackResult(messages: ChatMessage[], error: string): ChatResult {
  return {
    ok: false,
    status: 200,
    error,
    answer: fallbackReply(messages[messages.length - 1]?.content || ''),
    mode: 'fallback_public_chat',
    model: null,
    provider: 'fallback',
  };
}

async function callAnthropic(messages: ChatMessage[]): Promise<ChatResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallbackResult(messages, 'ANTHROPIC_API_KEY is not configured');
  }

  const model = safeModel(process.env.ANTHROPIC_MODEL, DEFAULT_ANTHROPIC_MODEL);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as any;

  if (!response.ok) {
    return {
      ...fallbackResult(messages, payload.error?.message || 'Anthropic API request failed'),
      status: response.status,
      model,
      provider: 'openai',
    };
  }

  const text = payload.content?.[0]?.type === 'text' ? payload.content[0].text : null;
  if (!text) {
    return fallbackResult(messages, 'No text content in Anthropic response');
  }

  return {
    ok: true,
    status: 200,
    answer: text,
    mode: 'openai_responses_api' as const,
    model,
    provider: 'openai',
  };
}

async function callOpenAI(messages: ChatMessage[]): Promise<ChatResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackResult(messages, 'OPENAI_API_KEY is not configured');
  }

  const model = safeModel(process.env.OPENAI_MODEL, DEFAULT_OPENAI_MODEL);
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions: SYSTEM_PROMPT,
      input: formatConversation(messages),
      max_output_tokens: 700,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as OpenAIResponse;

  if (!response.ok) {
    return {
      ...fallbackResult(messages, payload.error?.message || 'OpenAI API request failed'),
      status: response.status,
      model,
      provider: 'openai',
    };
  }

  return {
    ok: true,
    status: 200,
    answer: extractOpenAIText(payload),
    mode: 'openai_responses_api',
    model,
    provider: 'openai',
  };
}

async function callOpenRouter(messages: ChatMessage[]): Promise<ChatResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return fallbackResult(messages, 'OPENROUTER_API_KEY is not configured');
  }

  const model = safeModel(process.env.OPENROUTER_MODEL, DEFAULT_OPENROUTER_MODEL);
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://tdealer01-crypto-dsg-control-plane.vercel.app',
      'X-Title': 'DSG ONE Public Assistant',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((message) => ({ role: message.role, content: message.content })),
      ],
      max_tokens: 700,
      temperature: 0.2,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as OpenRouterResponse;

  if (!response.ok) {
    return {
      ...fallbackResult(messages, payload.error?.message || 'OpenRouter API request failed'),
      status: response.status,
      model,
      provider: 'openrouter',
    };
  }

  return {
    ok: true,
    status: 200,
    answer: extractOpenRouterText(payload),
    mode: 'openrouter_chat_completions_api',
    model,
    provider: 'openrouter',
  };
}

async function callNvidia(messages: ChatMessage[]): Promise<ChatResult> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return fallbackResult(messages, 'NVIDIA_API_KEY is not configured');
  }

  const model = safeModel(
    process.env.NVIDIA_MODEL_CHAT,
    'nvidia/nemotron-3-ultra-550b-a55b',
  );

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((message) => ({ role: message.role, content: message.content })),
      ],
      max_tokens: 700,
      temperature: 0.2,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as OpenRouterResponse;

  if (!response.ok) {
    return {
      ...fallbackResult(messages, payload.error?.message || 'NVIDIA API request failed'),
      status: response.status,
      model,
      provider: 'nvidia',
    };
  }

  return {
    ok: true,
    status: 200,
    answer: extractOpenRouterText(payload),
    mode: 'openrouter_chat_completions_api',
    model,
    provider: 'nvidia',
  };
}

async function callModel(messages: ChatMessage[]): Promise<ChatResult> {
  const provider = resolveProvider();

  // Try primary provider
  if (provider === 'openrouter') {
    const result = await callOpenRouter(messages);
    if (result.ok) return result;
    // Try NVIDIA fallback if OpenRouter fails
    if (process.env.NVIDIA_API_KEY) {
      const nvidiaResult = await callNvidia(messages);
      if (nvidiaResult.ok) return nvidiaResult;
    }
    return result;
  }

  if (provider === 'anthropic') return callAnthropic(messages);
  if (provider === 'openai') return callOpenAI(messages);
  if (provider === 'nvidia') return callNvidia(messages);

  return fallbackResult(messages, 'No AI provider key is configured');
}

export async function POST(request: Request) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'public-chat'),
    limit: RATE_LIMIT,
    windowMs: RATE_WINDOW_MS,
  });
  const headers = buildRateLimitHeaders(rateLimit, RATE_LIMIT);

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }

  const body = await request.json().catch(() => null);
  const messages = normalizeMessages(body);

  if (!messages.length || messages[messages.length - 1]?.role !== 'user') {
    return NextResponse.json({ error: 'message or messages ending with a user message is required' }, { status: 400, headers });
  }

  try {
    const result = await callModel(messages);

    // Lead capture: detect email or high-intent in conversation (fire-and-forget)
    const email = extractEmail(messages);
    if (email) {
      void captureLead(email, messages, intentScore(messages));
    }

    return NextResponse.json(
      {
        ok: result.ok,
        mode: result.mode,
        provider: result.provider,
        model: result.model,
        reply: result.answer,
        answer: result.answer,
        error: result.error || null,
        links: {
          demo: DEMO_URL,
          requestAccess: REQUEST_ACCESS_URL,
          pricing: PRICING_URL,
          skills: '/marketplace/skills',
          login: '/login',
        },
        safety: {
          authenticated_actions: false,
          execution_allowed: false,
          login_required_for_runtime: true,
        },
        suggestions: SUGGESTIONS,
      },
      { status: result.status, headers },
    );
  } catch (error) {
    logServerError(error, 'public-chat-ai-provider');
    return serverErrorResponse({ headers });
  }
}
