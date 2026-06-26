import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Test OpenRouter API connection
 * POST /api/setup/test-openrouter
 *
 * Request body:
 * {
 *   "apiKey": "sk-or-...",
 *   "model": "anthropic/claude-3.5-haiku"
 * }
 *
 * Response:
 * {
 *   "ok": true,
 *   "model": "anthropic/claude-3.5-haiku",
 *   "latency": 123,
 *   "message": "Connection successful"
 * }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { apiKey, model } = body;

    if (!apiKey || !model) {
      return NextResponse.json(
        { error: 'Missing required fields: apiKey, model' },
        { status: 400 }
      );
    }

    // Validate API key format
    if (!apiKey.startsWith('sk-or-')) {
      return NextResponse.json(
        { error: 'Invalid OpenRouter API key format' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Test connection with a simple ping message
    const testResponse = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://dsg-one-setup-wizard',
          'X-Title': 'DSG AI Setup Wizard',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: 'ping',
            },
          ],
          max_tokens: 10,
        }),
      }
    );

    const latency = Date.now() - startTime;

    if (!testResponse.ok) {
      const errorData = await testResponse.json().catch(() => ({}));

      if (testResponse.status === 401) {
        return NextResponse.json(
          {
            error: 'Invalid API key. Check your OpenRouter credentials.',
            model: model,
            statusCode: 401,
          },
          { status: 401 }
        );
      }

      if (testResponse.status === 404) {
        return NextResponse.json(
          {
            error: `Model not found: ${model}. Check model availability on OpenRouter.`,
            model: model,
            statusCode: 404,
          },
          { status: 404 }
        );
      }

      const errorMessage =
        (errorData as any).error?.message || testResponse.statusText;

      return NextResponse.json(
        {
          error: `OpenRouter API error: ${errorMessage}`,
          model: model,
          statusCode: testResponse.status,
        },
        { status: testResponse.status }
      );
    }

    const responseData = await testResponse.json();

    return NextResponse.json({
      ok: true,
      model: model,
      latency: latency,
      message: 'Connection successful',
      usage: (responseData as any).usage || null,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: `Connection test failed: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
