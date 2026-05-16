import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { applyRateLimit, getRateLimitKey, buildRateLimitHeaders } from '../../../../lib/security/rate-limit';

export const dynamic = 'force-dynamic';

// OpenAI Codex via Responses API (codex-mini-latest — free tier eligible)
// Docs: https://platform.openai.com/docs/api-reference/responses
const OPENAI_BASE = 'https://api.openai.com/v1';

type CodexTool =
  | { type: 'code_interpreter' }
  | { type: 'file_search'; vector_store_ids?: string[] }
  | { type: 'function'; name: string; description: string; parameters: Record<string, unknown> };

type CodexRequest = {
  instructions?: string;   // system prompt
  input: string;           // user task / prompt
  model?: string;
  tools?: CodexTool[];
  temperature?: number;
  previous_response_id?: string; // for multi-turn
};

// POST /api/dsg-bridge/codex
// Sends a task to OpenAI Codex (codex-mini-latest) via Responses API.
// Reads OPENAI_API_KEY from env — free-tier eligible, no per-token GPT-4o cost.
export async function POST(request: Request) {
  const rl = await applyRateLimit({
    key: getRateLimitKey(request, 'dsg-codex'),
    limit: 20,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limit_exceeded' },
      { status: 429, headers: buildRateLimitHeaders(rl, 20) },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'OPENAI_API_KEY not configured' },
      { status: 503 },
    );
  }

  // Auth: require Supabase session
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as CodexRequest | null;
  if (!body?.input) {
    return NextResponse.json({ ok: false, error: 'input is required' }, { status: 400 });
  }

  const payload = {
    model: body.model ?? 'codex-mini-latest',
    input: body.input,
    instructions: body.instructions ?? 'You are a DSG governance agent. Be concise and accurate.',
    tools: body.tools ?? [{ type: 'code_interpreter' }],
    ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
    ...(body.previous_response_id ? { previous_response_id: body.previous_response_id } : {}),
  };

  try {
    const res = await fetch(`${OPENAI_BASE}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: (data as any)?.error?.message ?? `OpenAI HTTP ${res.status}` },
        { status: res.status, headers: buildRateLimitHeaders(rl, 20) },
      );
    }

    return NextResponse.json(
      { ok: true, response: data },
      { headers: buildRateLimitHeaders(rl, 20) },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'network_error' },
      { status: 502 },
    );
  }
}
