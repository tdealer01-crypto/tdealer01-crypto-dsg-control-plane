import { NextResponse } from 'next/server';
import { logServerError, serverErrorResponse } from '../../../lib/security/error-response';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../lib/security/rate-limit';

export const dynamic = 'force-dynamic';

const DEMO_URL = '/enterprise-proof/demo';
const REQUEST_ACCESS_URL = '/request-access';
const PRICING_URL = '/pricing';

const SUGGESTIONS = [
  'ดูเดโม่ระบบ',
  'ดู pricing และเลือกแพ็กเกจ',
  'ขอ demo หรือ request access',
  'อธิบาย DSG Agent และ runtime approval',
  'เข้าสู่ระบบเพื่อใช้ dashboard และ agent execution',
];

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;
const MAX_MESSAGES = 8;
const MAX_MESSAGE_LENGTH = 1600;
const DEFAULT_MODEL = 'gpt-4.1-mini';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

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

function extractOutputText(payload: OpenAIResponse): string {
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

async function callOpenAI(messages: ChatMessage[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      status: 200,
      error: 'OPENAI_API_KEY is not configured',
      answer: fallbackReply(messages[messages.length - 1]?.content || ''),
      mode: 'fallback_public_chat',
      model: null,
    };
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions:
        'You are DSG Public Assistant for DSG ONE / CospinDSG. Answer in the user language. Be concise, factual, and useful. Explain DSG product value, product usage, audit/enforce modes, pricing/demo/request-access paths, and safe next steps. Public mode must not execute actions, request secrets, or claim production readiness without evidence.',
      input: formatConversation(messages),
      max_output_tokens: 700,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as OpenAIResponse;

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: payload.error?.message || 'OpenAI API request failed',
      answer: fallbackReply(messages[messages.length - 1]?.content || ''),
      mode: 'fallback_public_chat',
      model,
    };
  }

  return {
    ok: true,
    status: 200,
    answer: extractOutputText(payload),
    mode: 'openai_responses_api',
    model,
  };
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
    const result = await callOpenAI(messages);

    return NextResponse.json(
      {
        ok: result.ok,
        mode: result.mode,
        model: result.model,
        reply: result.answer,
        answer: result.answer,
        error: result.error || null,
        links: {
          demo: DEMO_URL,
          requestAccess: REQUEST_ACCESS_URL,
          pricing: PRICING_URL,
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
    logServerError(error, 'public-chat-openai');
    return serverErrorResponse({ headers });
  }
}
