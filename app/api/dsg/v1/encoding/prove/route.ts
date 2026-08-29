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

type ProofFailureStage =
  | 'auth'
  | 'validation'
  | 'supabase_client'
  | 'proof_lookup'
  | 'proof_insert'
  | 'chain_head'
  | 'response';

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

function failureStage(error: unknown): ProofFailureStage {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('encoding_proof_store:supabase_client:')) return 'supabase_client';
  if (message.includes('encoding_proof_store:insert:')) return 'proof_insert';
  if (
    message.includes('encoding_proof_store:lookup_chain_head:') ||
    message.includes('encoding_proof_store:chain_or_replay_conflict')
  ) {
    return 'chain_head';
  }
  if (message.includes('encoding_proof_store:')) return 'proof_lookup';
  return 'response';
}

function logFailure(
  requestId: string,
  stage: ProofFailureStage,
  error: unknown,
  fields: Record<string, unknown> = {},
): void {
  const safeError =
    error instanceof Error
      ? { name: error.name, message: error.message }
      : { name: 'Error', message: String(error) };
  console.error('dsg.encoding.prove.failed', {
    requestId,
    stage,
    ...fields,
    error: safeError,
  });
}

function usageFailure(error?: string) {
  const accessMode = error?.startsWith('delivery_blocked:')
    ? error.slice('delivery_blocked:'.length)
    : 'billing_unavailable';
  const requiresUpgrade =
    accessMode === 'quota_exceeded' || accessMode === 'subscription_inactive';

  return {
    status: requiresUpgrade ? 402 : 503,
    body: {
      ok: false,
      error: 'usage_evidence_unavailable',
      accessMode,
      requiresUpgrade,
      message: requiresUpgrade
        ? 'Encoding proof withheld because the current subscription does not authorize this usage slot.'
        : 'Encoding proof withheld because usage evidence could not be completed safely.',
      upgradeUrl: '/pricing#dsg-gate',
    },
  };
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
  const requestId = crypto.randomUUID();
  let caller: Awaited<ReturnType<typeof requireDsgAuth>>;

  try {
    caller = await requireDsgAuth(req);
  } catch (error) {
    logFailure(requestId, 'auth', error);
    return NextResponse.json(
      { ok: false, error: 'proof_failed', requestId, status: 'BLOCK' },
      { status: 500, headers: responseHeaders(req) },
    );
  }

  if (!caller.ok) {
    console.warn('dsg.encoding.prove.denied', { requestId, stage: 'auth' });
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
        requiresUpgrade: entitlement.requiresPayment,
        tier: entitlement.tier,
        accessMode: entitlement.accessMode,
        upgradeUrl: entitlement.upgradeUrl,
      },
      {
        status: entitlement.requiresPayment ? 402 : 503,
        headers: responseHeaders(req, rateLimitHeaders),
      },
    );
  }

  try {
    const parsedBody = await readJsonBody(req, { maxBytes: 32_000 });
    if (!parsedBody.ok) {
      console.warn('dsg.encoding.prove.denied', {
        requestId,
        stage: 'validation',
        reason: parsedBody.error,
      });
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
    if ('error' in requestValidation) {
      console.warn('dsg.encoding.prove.denied', {
        requestId,
        stage: 'validation',
        reason: requestValidation.error,
      });
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
    if ('error' in runtimeShape) {
      console.warn('dsg.encoding.prove.denied', {
        requestId,
        stage: 'validation',
        reason: runtimeShape.error,
      });
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
        logFailure(requestId, 'response', new Error('stored_proof_integrity_failure'));
        return NextResponse.json(
          { ok: false, error: 'stored_proof_integrity_failure', status: 'BLOCK', requestId },
          { status: 500, headers: responseHeaders(req, rateLimitHeaders) },
        );
      }

      const replayUsage = await recordGateEvaluation(
        data.idempotencyKey,
        caller.orgId,
        'encoding/prove',
        replay.proof.status,
        Date.now() - startMs,
      );
      if (!replayUsage.recorded) {
        const failure = usageFailure(replayUsage.error);
        return NextResponse.json(failure.body, {
          status: failure.status,
          headers: responseHeaders(req, rateLimitHeaders),
        });
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

    const durationMs = Date.now() - startMs;
    const usage = await recordGateEvaluation(
      data.idempotencyKey,
      caller.orgId,
      'encoding/prove',
      proof.status,
      durationMs,
    );
    if (!usage.recorded) {
      const failure = usageFailure(usage.error);
      return NextResponse.json(failure.body, {
        status: failure.status,
        headers: responseHeaders(req, rateLimitHeaders),
      });
    }

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
      durationMs,
    });

    return proofResponse(req, proof, rateLimitHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stage = failureStage(error);
    logFailure(requestId, stage, error);

    if (message.includes('encoding_proof_store:chain_or_replay_conflict')) {
      return NextResponse.json(
        {
          ok: false,
          error: 'proof_chain_conflict',
          status: 'BLOCK',
          requestId,
          failureReasons: [
            'The proof-chain head changed concurrently. Retry the same canonical request and idempotencyKey.',
          ],
        },
        { status: 409, headers: responseHeaders(req, rateLimitHeaders) },
      );
    }
    if (message.includes('encoding_proof_store:')) {
      return NextResponse.json(
        { ok: false, error: 'proof_store_unavailable', status: 'BLOCK', requestId },
        { status: 503, headers: responseHeaders(req, rateLimitHeaders) },
      );
    }
    return NextResponse.json(
      { ok: false, error: 'proof_failed', requestId, status: 'BLOCK' },
      { status: 500, headers: responseHeaders(req, rateLimitHeaders) },
    );
  }
}
