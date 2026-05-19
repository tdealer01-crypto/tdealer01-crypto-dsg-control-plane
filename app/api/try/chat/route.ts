import { NextResponse } from 'next/server';
import { logServerError, serverErrorResponse } from '../../../../lib/security/error-response';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 1000;
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 2000;
const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4.1-mini';

const SYSTEM_PROMPT = `You are DSG Expert Assistant — a specialist in DSG (Deterministic Safety Gate) for AI Agent governance.

PRODUCT KNOWLEDGE:
- DSG Gate sits between an AI agent and its targets (APIs, databases, files). Every action the agent attempts passes through DSG first.
- The Gate metaphor: like an immigration checkpoint — agents must declare their intended actions upfront, receive a timestamp stamp, then only perform what they declared. If they try something undeclared or exceed time limits, DSG blocks them automatically.
- Decisions: ALLOW (action passes), BLOCK (action rejected), REVIEW (needs human approval), AUDIT (logged only, not blocked).
- Every decision has: hash, timestamp (ms), reason, and prev_hash linking to prior entry — forming a cryptographic chain.
- Any modification to historical records breaks the chain — tamper-evident by design.
- Invariant system (MAKK-8): 8 deterministic invariants that every agent action must satisfy. Not probability-based — a violation either happens or it doesn't.
- Modes: audit_only (log all), gate (log + block violations), full (log + block + chain verification per request).

SETUP PROCESS:
1. Sign up at /signup (30 seconds, no credit card)
2. Verify email → receive API key immediately
3. In your agent code: POST to /api/gate/inspect with { action, session_id } to check permission
4. Agent declares its intentions at session start via POST /api/gate/declare with { actions[], ttl_minutes }
5. DSG stamps each allowed action, logs everything, blocks anything undeclared or over TTL

API INTEGRATION EXAMPLE:
POST https://your-dsg-instance.com/api/try/gate
{ "session_id": "sess_abc", "declared_actions": ["read_file", "send_email"], "ttl_minutes": 30 }
→ Returns: { "ok": true, "declaration_stamp": "DSG-A3F8E2C1", "expires_at": "..." }

Then for each action:
POST /api/try/gate
{ "session_id": "sess_abc", "action": "read_file path=/reports/q1.pdf" }
→ Returns: { "decision": "ALLOW", "stamp": "DSG-B7D4F1A9" } or { "decision": "BLOCK", "reason": "..." }

PRICING (after 15-day free trial):
- Pro: $99/month — unlimited gate evaluations, 90-day audit trail, 3 API keys, email support
- Business: $299/month — team management, webhooks, PDF export, priority support
- Enterprise: $999/month — custom policy engine, 99.9% SLA, dedicated onboarding

TRIAL DETAILS:
- 15 days, full features, no credit card
- Production API key from day 1 (not a sandbox)
- Audit trail is real — not simulated
- Direct founder support during trial

COMMON QUESTIONS:
- "How do I connect my agent?" → Add 2 API calls to your agent: declare at session start, inspect before each action
- "What happens when gate blocks?" → Returns { decision: "BLOCK", reason: "..." }, your agent receives the rejection and should handle it gracefully
- "Is the audit trail tamper-proof?" → Yes — SHA256 hash chain, any modification breaks the chain, retroactively detectable
- "Can I use it with LangChain/AutoGen/CrewAI?" → Yes — wrap each tool call with the gate inspect call
- "What is MAKK-8?" → 8 deterministic invariants (rightView, rightResolve, rightSpeech, rightConduct, rightLivelihood, rightEffort, rightMindfulness, rightSamadhi) — ensures agent actions are coherent, bounded, and reversible
- "How do I connect?" → Add 2 lines to your agent code: declare at session start, inspect before every action
- "How long is the free trial?" → 15 days, full features, no credit card required
- "How does blocking work?" → DSG checks every action before it passes. If it was not declared upfront or exceeds the TTL — it is blocked immediately

TONE: Expert, concise, helpful. Answer in the language the user writes in (Thai or English). Be specific — give code examples when asked. Never claim false capabilities.`;

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type Provider = 'openai' | 'openrouter';

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
  error?: { message?: string };
};

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

type ChatResult = {
  ok: boolean;
  answer: string;
  model: string | null;
  provider: Provider | 'fallback';
};

function normalizeMessages(body: unknown): ChatMessage[] {
  const candidate = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};

  if (Array.isArray(candidate.messages)) {
    return (candidate.messages as unknown[])
      .filter((m): m is ChatMessage => {
        if (!m || typeof m !== 'object') return false;
        const item = m as Partial<ChatMessage>;
        return (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string';
      })
      .slice(-MAX_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));
  }

  const message = typeof candidate.message === 'string' ? candidate.message.trim() : '';
  return message ? [{ role: 'user', content: message.slice(0, MAX_MESSAGE_LENGTH) }] : [];
}

function isSecretLike(v: string | undefined) {
  return Boolean(v && (v.startsWith('sk-') || v.startsWith('sk_') || v.startsWith('sk-or-')));
}

function safeModel(v: string | undefined, fallback: string) {
  return !v || isSecretLike(v) ? fallback : v;
}

function extractOpenAIText(payload: OpenAIResponse): string {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  return (
    payload.output
      ?.flatMap((i) => i.content ?? [])
      .map((c) => c.text ?? '')
      .join('\n')
      .trim() || ''
  );
}

function fallbackAnswer(message: string): string {
  const lower = message.toLowerCase();
  if (/connect|integrate|how to use/.test(lower)) {
    return 'Add 2 lines to your agent code: (1) POST /api/try/gate with declared_actions at session start (2) POST /api/try/gate with the action before each call — DSG will stamp if ALLOW or return a reason if BLOCK';
  }
  if (/price|pricing/.test(lower)) {
    return 'Free trial for 15 days (no card required) → Pro $99/month → Business $299/month → Enterprise $999/month. See details at /pricing';
  }
  if (/block/.test(lower)) {
    return 'DSG blocks actions that: (1) were not listed in declared_actions (2) exceed the configured TTL (3) match a dangerous pattern such as "delete all", "drop table", "bypass policy" — returns { decision: "BLOCK", reason: "..." }';
  }
  if (/signup|start/.test(lower)) {
    return 'Sign up at /signup — takes 30 seconds, no credit card required. You receive your API key immediately after email verification.';
  }
  return 'Ask about DSG Gate, how to connect your agent, audit trail, or pricing — happy to help.';
}

async function callOpenAI(messages: ChatMessage[]): Promise<ChatResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, answer: fallbackAnswer(messages.at(-1)?.content ?? ''), model: null, provider: 'fallback' };

  const model = safeModel(process.env.OPENAI_MODEL, DEFAULT_OPENAI_MODEL);
  const conv = messages.map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`).join('\n\n');

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, instructions: SYSTEM_PROMPT, input: conv, max_output_tokens: 800 }),
  });

  const payload = (await res.json().catch(() => ({}))) as OpenAIResponse;
  if (!res.ok) return { ok: false, answer: fallbackAnswer(messages.at(-1)?.content ?? ''), model, provider: 'openai' };

  const text = extractOpenAIText(payload);
  return { ok: true, answer: text || fallbackAnswer(messages.at(-1)?.content ?? ''), model, provider: 'openai' };
}

async function callOpenRouter(messages: ChatMessage[]): Promise<ChatResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { ok: false, answer: fallbackAnswer(messages.at(-1)?.content ?? ''), model: null, provider: 'fallback' };

  const model = safeModel(process.env.OPENROUTER_MODEL, DEFAULT_OPENROUTER_MODEL);
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tdealer01-crypto-dsg-control-plane.vercel.app',
      'X-Title': 'DSG Trial Expert Assistant',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 800,
      temperature: 0.15,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as OpenRouterResponse;
  if (!res.ok) return { ok: false, answer: fallbackAnswer(messages.at(-1)?.content ?? ''), model, provider: 'openrouter' };

  const text = payload.choices?.[0]?.message?.content?.trim() ?? '';
  return { ok: true, answer: text || fallbackAnswer(messages.at(-1)?.content ?? ''), model, provider: 'openrouter' };
}

async function callModel(messages: ChatMessage[]): Promise<ChatResult> {
  const requested = (process.env.PUBLIC_CHAT_PROVIDER ?? process.env.AI_PROVIDER ?? '').toLowerCase();
  if (requested === 'openrouter') return callOpenRouter(messages);
  if (requested === 'openai') return callOpenAI(messages);
  if (process.env.OPENAI_API_KEY) return callOpenAI(messages);
  if (process.env.OPENROUTER_API_KEY) return callOpenRouter(messages);
  return { ok: false, answer: fallbackAnswer(messages.at(-1)?.content ?? ''), model: null, provider: 'fallback' };
}

const TRY_SUGGESTIONS = [
  'How do I connect my agent to DSG?',
  'What happens when gate blocks?',
  'Explain the audit trail',
  'Pricing after the free trial',
  'How to use DSG with LangChain',
];

export async function POST(request: Request) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'try-chat'),
    limit: RATE_LIMIT,
    windowMs: RATE_WINDOW_MS,
  });
  const headers = buildRateLimitHeaders(rateLimit, RATE_LIMIT);

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }

  const body = await request.json().catch(() => null);
  const messages = normalizeMessages(body);

  if (!messages.length || messages.at(-1)?.role !== 'user') {
    return NextResponse.json({ error: 'message required' }, { status: 400, headers });
  }

  try {
    const result = await callModel(messages);
    return NextResponse.json(
      { ok: result.ok, reply: result.answer, provider: result.provider, suggestions: TRY_SUGGESTIONS },
      { status: 200, headers },
    );
  } catch (error) {
    logServerError(error, 'try-chat');
    return serverErrorResponse({ headers });
  }
}
