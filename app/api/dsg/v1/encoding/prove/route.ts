/**
 * Encoding Proof Gate API Route
 * POST /api/dsg/v1/encoding/prove
 *
 * Authenticated + org-rate-limited + entitlement-gated. Proof issuance is
 * persisted so nonce replay, idempotency and hash-chain continuity are enforced
 * by server-observed state rather than caller claims.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createEncodingProof,
  validateProofHash,
} from '@/lib/dsg/deterministic/encoding-proof-engine';
import {
  validateEncodingRuntimeShape,
} from '@/lib/dsg/deterministic/encoding-proof-validator';
import {
  inspectEncodingProofRequest,
  persistEncodingProof,
} from '@/lib/dsg/deterministic/encoding-proof-store';
import { canonicalHash, type CanonicalInput } from '@/lib/runtime/canonical';
import { handleApiError } from '@/lib/security/api-error';
import {
  applyRateLimit,
  buildRateLimitHeaders,
  getRateLimitKey,
} from '@/lib/security/rate-limit';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';
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
import type {
  EncodingType,
  EncodingProveSuccessResponse,
  EncodingProveErrorResponse,
} from '@/lib/dsg/deterministic/encoding-proof-types';

export const dynamic = 'force-dynamic';

function canonical(value: unknown): CanonicalInput {
  return value as CanonicalInput;
}

function addCors(req: Request, response: NextResponse): NextResponse {
  const cors = buildCorsHeaders(req);
  cors.forEach((value, key) => response.headers.set(key, value));
  return response;
}

function responseHeaders(req: Request, base?: HeadersInit): Headers {
  return buildCorsHeaders(req, base);
}

function validateRequest(data: unknown):
  | {
      valid: true;
      value: {
        problemId: string;
        encodingType: EncodingType;
        encoding: unknown;
        nonce: string;
        idempotencyKey: string;
      };
    }
  | { valid: false; error: string } {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, error: 'request body must be an object' };
  }
  const body = data as Record<string, unknown>;
  const problemId = typeof body.problemId === 'string' ? body.problemId.trim() : '';
  const nonce = typeof body.nonce === 'string' ? body.nonce : '';
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';
  const encodingType = body.encodingType;

  if (!problemId || problemId.length > 200) {
    return { valid: false, error: 'problemId is required and must be at most 200 characters' };
  }
  if (encodingType !== 'qubo-v1' && encodingType !== 'ising-v1') {
    return { valid: false, error: 'encodingType must be "qubo-v1" or "ising-v1"' };
  }
  if (!body.encoding || typeof body.encoding !== 'object' || Array.isArray(body.encoding)) {
    return { valid: false, error: 'encoding is required and must be an object' };
  }
  if (nonce.length < 8 || nonce.length > 200) {
    return { valid: false, error: 'nonce must contain 8 to 200 characters' };
  }
  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    return { valid: false, error: 'idempotencyKey must contain 8 to 200 characters' };
  }

  return {
    valid: true,
    value: { problemId, encodingType, encoding: body.encoding, nonce, idempotencyKey },
  };
}

function proofResponse(
  req: Request,
  proof: ReturnType<typeof createEncodingProof>,
  baseHeaders: HeadersInit,
  idempotentReplay = false,
): NextResponse {
  const statusCode = proof.status === 'BLOCK' ? 422 : 200;
  const headers = responseHeaders(req, baseHeaders);
  headers.set('X-Proof-ID', proof.proofId);
  headers.set('X-Encoding-Hash', proof.encodingHash);
  headers.set('X-Proof-Hash', proof.proofHash);
  if (idempotentReplay) headers.set('X-Idempotent-Replay', 'true');

  if (proof.status === 'PASS') {
    return NextResponse.json(
      {
        ok: true,
        proofId: proof.proofId,
        status: proof.status,
        proof,
        ...(idempotentReplay ? { idempotentReplay: true } : {}),
      } satisfies EncodingProveSuccessResponse,
      { status: statusCode, headers },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: 'encoding_validation_failed',
      status: proof.status,
      failedChecks: proof.failedChecks,
      failureReasons: proof.failureReasons,
    } satisfies EncodingProveErrorResponse,
    { status: statusCode, headers },
  );
}

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return buildPreflightResponse(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const caller = await requireDsgAuth(req);
  if (!caller.ok) {
    return addCors(req, dsgAuthError(caller as typeof caller & { ok: false }));
  }

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
      { status: 429, headers: responseHeaders(req, rateLimitHeaders) },
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
      { status: 402, headers: responseHeaders(req, rateLimitHeaders) },
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
        { status: parsedBody.status, headers: responseHeaders(req, rateLimitHeaders) },
      );
    }

    const requestValidation = validateRequest(parsedBody.value);
    if (!requestValidation.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_request_format',
          status: 'BLOCK',
          failureReasons: [requestValidation.error],
        } satisfies EncodingProveErrorResponse,
        { status: 400, headers: responseHeaders(req, rateLimitHeaders) },
      );
    }

    const data = requestValidation.value;
    const runtimeShape = validateEncodingRuntimeShape(data.encoding, data.encodingType);
    if (!runtimeShape.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_encoding_structure',
          status: 'BLOCK',
          failureReasons: [runtimeShape.error],
        } satisfies EncodingProveErrorResponse,
        { status: 400, headers: responseHeaders(req, rateLimitHeaders) },
      );
    }

    const requestHash = canonicalHash(
      canonical({
        problemId: data.problemId,
        encodingType: data.encodingType,
        encoding: runtimeShape.encoding,
        nonce: data.nonce,
        idempotencyKey: data.idempotencyKey,
      }),
    );

    const replay = await inspectEncodingProofRequest({
      organizationId: caller.orgId,
      nonce: data.nonce,
      idempotencyKey: data.idempotencyKey,
      requestHash,
    });

    if (replay.kind === 'replay') {
      if (!validateProofHash(replay.proof)) {
        return NextResponse.json(
          { ok: false, error: 'stored_proof_integrity_failure', status: 'BLOCK' },
          { status: 500, headers: responseHeaders(req, rateLimitHeaders) },
        );
      }
      return proofResponse(req, replay.proof, rateLimitHeaders, true);
    }

    if (replay.kind === 'idempotency_conflict' || replay.kind === 'nonce_replay') {
      return NextResponse.json(
        {
          ok: false,
          error: replay.kind,
          status: 'BLOCK',
          failureReasons: [replay.message],
        } satisfies EncodingProveErrorResponse,
        { status: 409, headers: responseHeaders(req, rateLimitHeaders) },
      );
    }

    const proof = createEncodingProof(
      runtimeShape.encoding,
      replay.previousProofHash,
      {
        problemId: data.problemId,
        encodingType: data.encodingType,
        requestHash,
        nonceHash: canonicalHash(canonical(data.nonce)),
        idempotencyKeyHash: canonicalHash(canonical(data.idempotencyKey)),
      },
    );

    await persistEncodingProof({
      organizationId: caller.orgId,
      problemId: data.problemId,
      encodingType: data.encodingType,
      nonce: data.nonce,
      idempotencyKey: data.idempotencyKey,
      requestHash,
      proof,
    });

    const statusCode = proof.status === 'BLOCK' ? 422 : 200;
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

    return proofResponse(req, proof, rateLimitHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('encoding_proof_store:chain_or_replay_conflict')) {
      return NextResponse.json(
        {
          ok: false,
          error: 'proof_chain_conflict',
          status: 'BLOCK',
          failureReasons: [
            'The proof-chain head changed concurrently. Retry the same canonical request and idempotencyKey.',
          ],
        } satisfies EncodingProveErrorResponse,
        { status: 409, headers: responseHeaders(req, rateLimitHeaders) },
      );
    }
    if (message.startsWith('encoding_proof_store:')) {
      return NextResponse.json(
        { ok: false, error: 'proof_store_unavailable', status: 'BLOCK' },
        { status: 503, headers: responseHeaders(req, rateLimitHeaders) },
      );
    }
    return handleApiError('api/dsg/v1/encoding/prove', error, {
      headers: responseHeaders(req, rateLimitHeaders),
    });
  }
}
