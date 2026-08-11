/**
 * Encoding Proof Gate API Route
 * POST /api/dsg/v1/encoding/prove
 *
 * Validates QUBO/Ising encodings and generates deterministic encoding proofs.
 * Access is authenticated, org-rate-limited, and metered through the existing
 * DSG gate entitlement pipeline.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createEncodingProof } from '@/lib/dsg/deterministic/encoding-proof-engine';
import { handleApiError } from '@/lib/security/api-error';
import {
  applyRateLimit,
  buildRateLimitHeaders,
  getRateLimitKey,
} from '@/lib/security/rate-limit';
import { readJsonBody } from '@/lib/security/request-json';
import {
  requireDsgAuth,
  dsgAuthError,
  logDsgApiCall,
} from '@/lib/dsg/auth/require-dsg-auth';
import {
  checkGateEntitlement,
  recordGateEvaluation,
} from '@/lib/dsg/gate-entitlement';
import {
  ProblemEncoding,
  EncodingProveSuccessResponse,
  EncodingProveErrorResponse,
} from '@/lib/dsg/deterministic/encoding-proof-types';

export const dynamic = 'force-dynamic';

function validateRequest(data: any): { valid: boolean; error?: string } {
  if (!data.problemId || typeof data.problemId !== 'string') {
    return { valid: false, error: 'problemId is required and must be a string' };
  }

  if (!data.encodingType || typeof data.encodingType !== 'string') {
    return { valid: false, error: 'encodingType is required and must be a string' };
  }

  if (!['qubo-v1', 'ising-v1'].includes(data.encodingType)) {
    return { valid: false, error: 'encodingType must be "qubo-v1" or "ising-v1"' };
  }

  if (!data.encoding || typeof data.encoding !== 'object') {
    return { valid: false, error: 'encoding is required and must be an object' };
  }

  if (!data.nonce || typeof data.nonce !== 'string') {
    return { valid: false, error: 'nonce is required and must be a string' };
  }

  if (!data.idempotencyKey || typeof data.idempotencyKey !== 'string') {
    return { valid: false, error: 'idempotencyKey is required and must be a string' };
  }

  return { valid: true };
}

function validateEncoding(encoding: any, encodingType: string): { valid: boolean; error?: string } {
  if (!Number.isInteger(encoding.variableCount) || encoding.variableCount <= 0) {
    return { valid: false, error: 'variableCount must be a positive integer' };
  }

  const kind = encoding.kind;
  if (!kind || !['qubo-v1', 'ising-v1'].includes(kind)) {
    return { valid: false, error: 'encoding.kind must be "qubo-v1" or "ising-v1"' };
  }

  if (kind !== encodingType) {
    return { valid: false, error: 'encoding.kind must match encodingType' };
  }

  if (kind === 'qubo-v1') {
    if (encoding.linear !== undefined && !Array.isArray(encoding.linear)) {
      return { valid: false, error: 'QUBO linear must be an array' };
    }
    if (encoding.quadratic !== undefined && !Array.isArray(encoding.quadratic)) {
      return { valid: false, error: 'QUBO quadratic must be an array' };
    }
  } else {
    if (encoding.h !== undefined && !Array.isArray(encoding.h)) {
      return { valid: false, error: 'Ising h must be an array' };
    }
    if (encoding.j !== undefined && !Array.isArray(encoding.j)) {
      return { valid: false, error: 'Ising j must be an array' };
    }
  }

  return { valid: true };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const caller = await requireDsgAuth(req);
  if (!caller.ok) return dsgAuthError(caller as typeof caller & { ok: false });

  const startMs = Date.now();

  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(req, `dsg-encoding-proof:${caller.orgId}`),
    limit: 60,
    windowMs: 60_000,
  });
  const rateLimitHeaders = buildRateLimitHeaders(rateLimit, 60);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limit_exceeded' },
      { status: 429, headers: rateLimitHeaders },
    );
  }

  const entitlement = await checkGateEntitlement(caller.orgId);
  if (!entitlement.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: entitlement.message,
        requiresUpgrade: true,
        tier: entitlement.tier,
        upgradeUrl: entitlement.upgradeUrl,
      },
      { status: 402, headers: rateLimitHeaders },
    );
  }

  try {
    const parsedBody = await readJsonBody(req, { maxBytes: 32_000 });
    if (!parsedBody.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: parsedBody.error,
          status: 'BLOCK',
          failureReasons: [parsedBody.error],
        } satisfies EncodingProveErrorResponse,
        { status: parsedBody.status, headers: rateLimitHeaders },
      );
    }

    const data = parsedBody.value as any;
    const requestValidation = validateRequest(data);
    if (!requestValidation.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_request_format',
          status: 'BLOCK',
          failureReasons: [requestValidation.error || 'Invalid request format'],
        } satisfies EncodingProveErrorResponse,
        { status: 400, headers: rateLimitHeaders },
      );
    }

    const encodingValidation = validateEncoding(data.encoding, data.encodingType);
    if (!encodingValidation.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_encoding_structure',
          status: 'BLOCK',
          failureReasons: [encodingValidation.error || 'Invalid encoding structure'],
        } satisfies EncodingProveErrorResponse,
        { status: 400, headers: rateLimitHeaders },
      );
    }

    const proof = createEncodingProof(data.encoding as ProblemEncoding);
    const statusCode = proof.status === 'BLOCK' ? 422 : 200;
    const headers = new Headers(rateLimitHeaders);
    headers.set('X-Proof-ID', proof.proofId);
    headers.set('X-Encoding-Hash', proof.encodingHash);

    const response = proof.status === 'PASS'
      ? NextResponse.json(
          {
            ok: true,
            proofId: proof.proofId,
            status: proof.status,
            proof,
          } satisfies EncodingProveSuccessResponse,
          { status: statusCode, headers },
        )
      : NextResponse.json(
          {
            ok: false,
            error: 'encoding_validation_failed',
            status: proof.status,
            failedChecks: proof.failedChecks,
            failureReasons: proof.failureReasons,
          } satisfies EncodingProveErrorResponse,
          { status: statusCode, headers },
        );

    void logDsgApiCall({
      orgId: caller.orgId,
      actorType: caller.actorType,
      apiKeyId: caller.actorType === 'api_key' ? caller.apiKeyId : undefined,
      userId: caller.actorType === 'user' ? caller.userId : undefined,
      route: 'encoding/prove',
      statusCode,
      gateStatus: proof.status,
      proofId: proof.proofId,
      durationMs: Date.now() - startMs,
    });

    void recordGateEvaluation(
      proof.proofId,
      caller.orgId,
      'encoding/prove',
      proof.status,
      Date.now() - startMs,
    );

    return response;
  } catch (error) {
    return handleApiError('api/dsg/v1/encoding/prove', error, {
      headers: rateLimitHeaders,
    });
  }
}
