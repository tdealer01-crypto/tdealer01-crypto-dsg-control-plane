import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_MODEL = 'gpt-4.1-mini';

function maskSecret(value: string | undefined) {
  if (!value) return null;
  if (value.length <= 8) return 'set';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export async function GET() {
  const configured = Boolean(process.env.OPENAI_API_KEY);
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  return NextResponse.json({
    ok: configured,
    service: 'public-chat-openai-runtime',
    provider: 'openai_responses_api',
    endpoint: '/api/public-chat',
    required_env: {
      OPENAI_API_KEY: configured ? 'set' : 'missing',
      OPENAI_MODEL: process.env.OPENAI_MODEL ? 'set' : 'default',
    },
    runtime: {
      model,
      openai_key_fingerprint: maskSecret(process.env.OPENAI_API_KEY),
      public_mode: true,
      execution_allowed: false,
    },
    next_step: configured
      ? 'POST /api/public-chat with { "message": "..." } and verify mode=openai_responses_api'
      : 'Set OPENAI_API_KEY in Vercel Project Settings -> Environment Variables for Production, then redeploy.',
  });
}
