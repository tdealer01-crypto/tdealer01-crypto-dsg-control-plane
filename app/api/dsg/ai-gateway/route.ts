import { NextResponse } from 'next/server';
import { executeDsgAiGatewayRequest, prepareDsgAiGatewayRequest, type DsgAiGatewayRequest } from '@/lib/dsg/connectors/ai-gateway';

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function parseMedia(value: unknown): DsgAiGatewayRequest['media'] {
  const normalize = (item: unknown) => {
    const record = asRecord(item);
    return {
      url: typeof record.url === 'string' ? record.url.trim() : undefined,
      base64: typeof record.base64 === 'string' ? record.base64.trim() : undefined,
      mimeType: typeof record.mimeType === 'string' ? record.mimeType.trim() : undefined,
    };
  };
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') return normalize(value);
  return undefined;
}

function parseRequest(body: Record<string, unknown>): DsgAiGatewayRequest {
  return {
    provider: String(body.provider || '').trim() as DsgAiGatewayRequest['provider'],
    goal: String(body.goal || '').trim(),
    prompt: String(body.prompt || '').trim(),
    model: typeof body.model === 'string' ? body.model.trim() : undefined,
    mode: typeof body.mode === 'string' ? body.mode.trim() as DsgAiGatewayRequest['mode'] : undefined,
    history: stringArray(body.history),
    evidence: stringArray(body.evidence),
    media: parseMedia(body.media),
    image: asRecord(body.image),
    audio: asRecord(body.audio),
    maxOutputTokens: typeof body.maxOutputTokens === 'number' ? body.maxOutputTokens : undefined,
    temperature: typeof body.temperature === 'number' ? body.temperature : undefined,
  };
}

export async function POST(req: Request) {
  const body = asRecord(await req.json().catch(() => null));
  const input = parseRequest(body);
  const execute = body.execute === true;

  if (!['openai', 'gemini', 'anthropic'].includes(input.provider)) {
    return NextResponse.json({ ok: false, error: { code: 'DSG_AI_PROVIDER_UNSUPPORTED', message: 'provider must be openai, gemini, or anthropic' } }, { status: 400 });
  }

  const result = execute ? await executeDsgAiGatewayRequest(input) : prepareDsgAiGatewayRequest(input);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
