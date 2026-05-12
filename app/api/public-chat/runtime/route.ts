import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4.1-mini';

type Provider = 'openai' | 'openrouter' | 'fallback';

function maskSecret(value: string | undefined) {
  if (!value) return null;
  if (value.length <= 8) return 'set';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function isSecretLike(value: string | undefined) {
  if (!value) return false;
  return value.startsWith('sk-') || value.startsWith('sk_') || value.startsWith('sk-or-');
}

function safeModel(value: string | undefined, fallback: string) {
  if (!value || isSecretLike(value)) return fallback;
  return value;
}

function resolveProvider(): Provider {
  const requested = (process.env.PUBLIC_CHAT_PROVIDER || process.env.AI_PROVIDER || '').toLowerCase();

  if (requested === 'openrouter') return 'openrouter';
  if (requested === 'openai') return 'openai';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  return 'fallback';
}

export async function GET() {
  const provider = resolveProvider();
  const openaiKeyConfigured = Boolean(process.env.OPENAI_API_KEY);
  const openrouterKeyConfigured = Boolean(process.env.OPENROUTER_API_KEY);
  const openaiModel = safeModel(process.env.OPENAI_MODEL, DEFAULT_OPENAI_MODEL);
  const openrouterModel = safeModel(process.env.OPENROUTER_MODEL, DEFAULT_OPENROUTER_MODEL);
  const activeModel = provider === 'openrouter' ? openrouterModel : openaiModel;

  return NextResponse.json({
    ok: provider !== 'fallback' && (provider === 'openrouter' ? openrouterKeyConfigured : openaiKeyConfigured),
    service: 'public-chat-ai-runtime',
    provider,
    supported_providers: ['openai', 'openrouter'],
    endpoint: '/api/public-chat',
    required_env: {
      PUBLIC_CHAT_PROVIDER: process.env.PUBLIC_CHAT_PROVIDER ? 'set' : 'auto',
      OPENAI_API_KEY: openaiKeyConfigured ? 'set' : 'missing',
      OPENAI_MODEL: process.env.OPENAI_MODEL ? (isSecretLike(process.env.OPENAI_MODEL) ? 'misconfigured_secret_value' : 'set') : 'default',
      OPENROUTER_API_KEY: openrouterKeyConfigured ? 'set' : 'missing',
      OPENROUTER_MODEL: process.env.OPENROUTER_MODEL ? (isSecretLike(process.env.OPENROUTER_MODEL) ? 'misconfigured_secret_value' : 'set') : 'default',
    },
    runtime: {
      model: activeModel,
      openai_key_fingerprint: maskSecret(process.env.OPENAI_API_KEY),
      openrouter_key_fingerprint: maskSecret(process.env.OPENROUTER_API_KEY),
      public_mode: true,
      execution_allowed: false,
    },
    next_step:
      provider === 'fallback'
        ? 'Set OPENAI_API_KEY or OPENROUTER_API_KEY in Vercel Environment Variables, then redeploy.'
        : 'POST /api/public-chat with { "message": "..." } and verify mode is openai_responses_api or openrouter_chat_completions_api.',
  });
}
