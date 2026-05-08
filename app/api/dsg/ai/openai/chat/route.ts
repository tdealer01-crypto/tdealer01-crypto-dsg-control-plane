import { NextResponse } from 'next/server';
import { runOpenAIAdapter } from '@/lib/dsg/ai/openai-adapter';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as {
    input?: string;
    messages?: Array<{ role: 'system' | 'developer' | 'user' | 'assistant'; content: string }>;
    model?: string;
    maxOutputTokens?: number;
    temperature?: number;
  } | null;

  if (!body) {
    return NextResponse.json({ ok: false, error: { message: 'INVALID_JSON_BODY' } }, { status: 400 });
  }

  try {
    const output = await runOpenAIAdapter(body);
    return NextResponse.json({ ok: true, data: output });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: { message: error instanceof Error ? error.message : 'OPENAI_ADAPTER_FAILED' },
    }, { status: error instanceof Error && error.message === 'OPENAI_API_KEY_MISSING' ? 503 : 500 });
  }
}
