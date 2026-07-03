import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getPaymentProcessor } from '../../../../lib/solana/payment';
import { publishExecutionResult } from '../../../../lib/websocket/redis-publisher';
import { handleApiError } from '../../../../lib/security/api-error';
import { buildCorsHeaders, buildPreflightResponse } from '../../../../lib/security/cors';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';

export const dynamic = 'force-dynamic';

const PAYMENT_RATE_LIMIT = 30;
const PAYMENT_RATE_WINDOW_MS = 60 * 1000;

interface PaymentRequestBody {
  executionId: string;
  agentId: string;
  recipientWallet: string;
  amountSOL: number;
  idempotencyKey: string;
  description: string;
  metadata?: Record<string, any>;
}

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

function jsonWithHeaders(
  request: Request,
  body: Record<string, unknown>,
  status: number,
  extraHeaders?: HeadersInit
) {
  return NextResponse.json(body, {
    status,
    headers: buildCorsHeaders(request, extraHeaders),
  });
}

export async function OPTIONS(request: Request) {
  return buildPreflightResponse(request);
}

export async function POST(request: Request) {
  let responseHeaders: Headers | undefined;

  try {
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, 'payment-process'),
      limit: PAYMENT_RATE_LIMIT,
      windowMs: PAYMENT_RATE_WINDOW_MS,
    });

    responseHeaders = buildCorsHeaders(
      request,
      buildRateLimitHeaders(rateLimit, PAYMENT_RATE_LIMIT)
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many payment requests' },
        { status: 429, headers: responseHeaders }
      );
    }

    const apiKey = extractBearerToken(request);
    if (!apiKey) {
      return jsonWithHeaders(request, { error: 'Missing Bearer token' }, 401, responseHeaders);
    }

    let paymentRequest: PaymentRequestBody;
    try {
      paymentRequest = await request.json();
    } catch (err) {
      return jsonWithHeaders(
        request,
        { error: 'Invalid JSON in request body' },
        400,
        responseHeaders
      );
    }

    // Validate required fields
    const { executionId, agentId, recipientWallet, amountSOL, idempotencyKey, description } =
      paymentRequest;

    if (!executionId || !agentId || !recipientWallet || !amountSOL || !idempotencyKey) {
      return jsonWithHeaders(
        request,
        {
          error: 'Missing required fields',
          required: ['executionId', 'agentId', 'recipientWallet', 'amountSOL', 'idempotencyKey'],
        },
        400,
        responseHeaders
      );
    }

    if (typeof amountSOL !== 'number' || amountSOL <= 0) {
      return jsonWithHeaders(
        request,
        { error: 'amountSOL must be a positive number' },
        400,
        responseHeaders
      );
    }

    // Process payment through SOLPaymentProcessor
    try {
      const processor = getPaymentProcessor();

      const result = await processor.processPayment({
        executionId,
        agentId,
        recipientWallet,
        amountSOL,
        idempotencyKey,
        description,
        metadata: paymentRequest.metadata,
      });

      // Publish result through WebSocket
      void publishExecutionResult({
        executionId,
        agentName: 'Nerve', // Nerve agent handles payments
        result,
        status: result.status === 'failed' ? 'failed' : 'success',
      }).catch((err) => {
        console.error('[api/payments/process] publishExecutionResult failed:', err);
      });

      const responseBody: Record<string, unknown> = {
        executionId: result.executionId,
        transactionSignature: result.transactionSignature,
        status: result.status,
        amountSOL: result.amountSOL,
        recipientWallet: result.recipientWallet,
        timestamp: result.timestamp,
        confirmationBlockHeight: result.confirmationBlockHeight,
        error: result.error,
      };

      return jsonWithHeaders(
        request,
        responseBody,
        result.status === 'failed' ? 400 : 200,
        responseHeaders
      );
    } catch (err) {
      console.error('[api/payments/process] Payment processing error:', err);
      throw err;
    }
  } catch (error) {
    return handleApiError('api/payments/process', error, {
      headers: responseHeaders ?? buildCorsHeaders(request),
    });
  }
}
