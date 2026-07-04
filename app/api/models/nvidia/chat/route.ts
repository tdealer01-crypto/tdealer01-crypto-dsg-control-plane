/**
 * NVIDIA NGC Model Chat API
 * POST /api/models/nvidia/chat
 *
 * Unified endpoint for NVIDIA NGC hosted LLM models
 * Supports model selection, streaming, and structured responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/security/api-error';
import { selectNGCModel, buildNGCRequest } from '@/lib/nvidia/ngc-models';

export const dynamic = 'force-dynamic';

interface NvidiaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface NvidiaChatRequest {
  messages: NvidiaMessage[];
  model?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
}

async function callNvidiaAPI(
  messages: NvidiaMessage[],
  modelId?: string,
  options?: { maxTokens?: number; temperature?: number; topP?: number },
): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY not configured');
  }

  const model = selectNGCModel(modelId);
  const payload = buildNGCRequest(model.id, messages as Array<{ role: string; content: string }>, options);

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`NVIDIA API error: ${response.status} ${detail.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('NVIDIA API returned no content');
  }

  return content;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as NvidiaChatRequest;
    const { messages, model, max_tokens, temperature, top_p } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid messages array' },
        { status: 400 },
      );
    }

    const response = await callNvidiaAPI(messages, model, {
      maxTokens: max_tokens,
      temperature,
      topP: top_p,
    });

    return NextResponse.json({
      ok: true,
      content: response,
      model: selectNGCModel(model).id,
    });
  } catch (error) {
    return handleApiError('api/models/nvidia/chat', error, {
      status: error instanceof Error && error.message.includes('API key') ? 503 : 500,
    });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'nvidia-ngc-api',
    description: 'NVIDIA NGC Model Chat Endpoint',
    models: ['nemotron-3-ultra-550b', 'nemotron-3-8b', 'llama-2-70b', 'mistral-7b'],
  });
}
