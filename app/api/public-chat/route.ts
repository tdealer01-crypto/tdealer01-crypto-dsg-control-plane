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
  'ดูเดโม่แบบ interactive',
  'ดู pricing และเลือกแพ็กเกจ',
  'ดู Skills Marketplace',
  'ขอ demo หรือ request access',
  'อธิบาย DSG Agent และ runtime approval',
];

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;
const MAX_MESSAGES = 8;
const MAX_MESSAGE_LENGTH = 1600;
const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4.1-mini';
const SYSTEM_PROMPT =
  'You are DSG Public Assistant for DSG ONE / CospinDSG. Answer in the user language. Be concise, factual, and useful. Explain DSG product value, product usage, audit/enforce modes, pricing/demo/request-access paths, and safe next steps. Public mode must not execute actions, request secrets, or claim production readiness without evidence.';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type Provider = 'openai' | 'openrouter';

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
const HIGH_INTENT_RE = /price|pricing|ราคา|แพ็ก|plan|trial|สมัคร|access|upgrade|buy|purchase|ซื้อ|จ่าย/i;

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
  if (/demo|เดโม/.test(text)) score += 20;
  if (/agent|runtime|governance/.test(text)) score += 20;
  if (messages.length >= 3) score += 20;
  return Math.min(score, 100);
}

async function captureLead(email: string, messages: ChatMessage[], score: number): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  if (requested === 'openrouter') return 'openrouter';
  if (requested === 'openai') return 'openai';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
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

  if (/demo|เดโม|เดโม่|proof|พิสูจน์|ตัวอย่าง/.test(lower)) {
    return `ดูหน้าเดโม่และ proof สำหรับ buyer ได้ที่ ${DEMO_URL} ครับ ถ้าต้องการทดลองแบบมีสิทธิ์ใช้งานจริง ให้ไปที่ ${REQUEST_ACCESS_URL}`;
  }

  if (/price|pricing|ราคา|แพ็ก|แพค|plan/.test(lower)) {
    return `ดูราคาและแพ็กเกจได้ที่ ${PRICING_URL} ครับ ถ้าต้องการใช้งานจริง แนะนำเริ่มจาก ${REQUEST_ACCESS_URL} แล้วค่อยเปิด dashboard หลังล็อกอิน`;
  }

  if (/access|สมัคร|เริ่ม|start|signup|sign up/.test(lower)) {
    return `เริ่มได้ที่ ${REQUEST_ACCESS_URL} หรือ /signup ครับ ถ้าคุณมีบัญชีแล้วให้เข้า /login เพื่อเปิด dashboard และใช้ DSG Agent แบบมี audit/approval`;
  }

  if (/agent|chatbot|bot|แชท|บอท|เอเจนต์/.test(lower)) {
    return `DSG Agent ช่วยวางแผน ตรวจ readiness และจัดการ agent workflow ได้ ดูเดโม่ที่ ${DEMO_URL} ได้เลย แต่ action จริง เช่น สร้าง agent หรือ execute runtime ต้องล็อกอินและผ่าน approval gate ก่อน เพื่อมี audit/ledger ครบ`;
  }

  if (/readiness|health|status|สถานะ/.test(lower)) {
    return 'หน้า public ตรวจ health/readiness พื้นฐานได้ แต่ข้อมูล runtime ลึก ๆ ต้องล็อกอิน dashboard ก่อน เพื่อป้องกันข้อมูลภายในและรักษา audit trail';
  }

  return `สวัสดีครับ ผมคือ DSG public assistant ถามเรื่อง DSG Agent, pricing, demo, request access หรือวิธีเข้า dashboard ได้เลยครับ ถ้าอยากดูเดโม่ตอนนี้ เปิด ${DEMO_URL}`;
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

async function callModel(messages: ChatMessage[]): Promise<ChatResult> {
  const provider = resolveProvider();
  if (provider === 'openrouter') return callOpenRouter(messages);
  if (provider === 'openai') return callOpenAI(messages);
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
