import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { dsgOneClient } from '../../../../lib/dsg-one/client';
import { applyRateLimit, getRateLimitKey, buildRateLimitHeaders } from '../../../../lib/security/rate-limit';

export const dynamic = 'force-dynamic';

// POST /api/dsg-bridge/ai-gateway
// Proxies multi-model AI requests through dsg-one-v1's OpenAI gateway.
// control-plane does not need OPENAI_API_KEY — all quota handled by dsg-one-v1.
export async function POST(request: Request) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'dsg-bridge-ai'),
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit, 30) },
    );
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.messages) {
    return NextResponse.json({ error: 'messages is required' }, { status: 400 });
  }

  const result = await dsgOneClient.ai.gateway(session.access_token, {
    model: body.model ?? 'deepseek/deepseek-chat-v3-0324:free',
    messages: body.messages,
    tools: body.tools,
    temperature: body.temperature,
    max_tokens: body.max_tokens,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status || 502, headers: buildRateLimitHeaders(rateLimit, 30) },
    );
  }

  return NextResponse.json(result.data, { headers: buildRateLimitHeaders(rateLimit, 30) });
}
