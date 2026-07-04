import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

interface NvidiaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface NvidiaChatRequest {
  model?: string;
  messages: NvidiaMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  seed?: number;
  stream?: boolean;
}

async function callNvidiaAPI(
  apiKey: string,
  payload: NvidiaChatRequest,
  stream: boolean = true,
): Promise<Response> {
  const model = payload.model || 'z-ai/glm-5.2';

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: payload.messages,
      temperature: payload.temperature ?? 1,
      top_p: payload.top_p ?? 1,
      max_tokens: payload.max_tokens ?? 1024,
      seed: payload.seed,
      stream,
    }),
  });

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.NVIDIA_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'NVIDIA_API_KEY not configured' },
        { status: 500 },
      );
    }

    const body = await request.json() as NvidiaChatRequest;
    const { messages, model, temperature, top_p, max_tokens, seed, stream = true } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages array is required' },
        { status: 400 },
      );
    }

    const response = await callNvidiaAPI(
      apiKey,
      {
        model,
        messages,
        temperature,
        top_p,
        max_tokens,
        seed,
      },
      stream,
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        `[api/models/nvidia/chat] NVIDIA API error ${response.status}:`,
        errorData.slice(0, 500),
      );
      return handleApiError(
        new Error(`NVIDIA API error: ${response.status}`),
        response.status,
      );
    }

    if (stream && response.body) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform',
          'connection': 'keep-alive',
        },
      });
    }

    return new Response(response.body, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch (error) {
    console.error('[api/models/nvidia/chat] error:', error);
    return handleApiError(error);
  }
}
