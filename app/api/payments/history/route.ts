import { NextResponse } from 'next/server';
import { getPaymentProcessor } from '../../../../lib/solana/payment';
import { handleApiError } from '../../../../lib/security/api-error';
import { buildCorsHeaders, buildPreflightResponse } from '../../../../lib/security/cors';

export const dynamic = 'force-dynamic';

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function OPTIONS(request: Request) {
  return buildPreflightResponse(request);
}

export async function GET(request: Request) {
  try {
    const apiKey = extractBearerToken(request);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing Bearer token' },
        {
          status: 401,
          headers: buildCorsHeaders(request),
        }
      );
    }

    const url = new URL(request.url);
    const executionId = url.searchParams.get('executionId');

    const processor = getPaymentProcessor();
    const history = processor.getPaymentHistory(executionId || undefined);

    return NextResponse.json(
      {
        count: history.length,
        payments: history,
      },
      {
        status: 200,
        headers: buildCorsHeaders(request),
      }
    );
  } catch (error) {
    return handleApiError('api/payments/history', error, {
      headers: buildCorsHeaders(request),
    });
  }
}
