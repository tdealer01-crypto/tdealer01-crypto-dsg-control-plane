import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, logApiError } from '@/lib/security/api-error';

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
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    // Validate API key format
    if (!apiKey.startsWith('sk-or-')) {
      return NextResponse.json(
        { error: 'Invalid input' },
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
      if (testResponse.status === 401) {
        logApiError('api/setup/test-openrouter', new Error('Invalid API key'), { status: 401 });
        return NextResponse.json(
          {
            error: 'Authentication failed: Invalid OpenRouter API key or account not found. Verify your API key at https://openrouter.ai/settings/keys',
            statusCode: 401,
            details: 'HTTP 401 Unauthorized - Check that your API key is valid and the account is active',
          },
          { status: 401 }
        );
      }

      if (testResponse.status === 403) {
        logApiError('api/setup/test-openrouter', new Error('Access forbidden'), { status: 403 });
        return NextResponse.json(
          {
            error: 'Access forbidden: Your API key may lack the required permissions',
            statusCode: 403,
            details: 'HTTP 403 Forbidden - Check your account permissions at https://openrouter.ai/settings',
          },
          { status: 403 }
        );
      }

      if (testResponse.status === 404) {
        logApiError('api/setup/test-openrouter', new Error('Model not found'), { status: 404, model });
        return NextResponse.json(
          {
            error: 'Model not found',
            statusCode: 404,
            details: `The model "${model}" is not available on OpenRouter. Check available models at https://openrouter.ai/models`,
          },
          { status: 404 }
        );
      }

      logApiError('api/setup/test-openrouter', new Error('API request failed'), { status: testResponse.status });
      return NextResponse.json(
        {
          error: 'API request failed',
          statusCode: testResponse.status,
          details: await testResponse.text().catch(() => 'See OpenRouter status at https://status.openrouter.ai'),
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
    return handleApiError('api/setup/test-openrouter', error);
  }
}
