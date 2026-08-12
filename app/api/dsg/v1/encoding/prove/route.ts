import { NextRequest, NextResponse } from 'next/server';
import { createEncodingProof, validateProofHash } from '@/lib/dsg/deterministic/encoding-proof-engine';
import {
  validateEncodingRuntimeShape,
} from '@/lib/dsg/deterministic/encoding-proof-validator';
import type {
  EncodingProveRequest,
  EncodingProveResponse,
  EncodingProveErrorResponse,
  EncodingProof,
  EncodingType,
  ProblemEncoding,
} from '@/lib/dsg/deterministic/encoding-proof-types';
import { canonicalHash, canonical } from '@/lib/runtime/canonical';
import {
  inspectEncodingProofRequest,
  persistEncodingProof,
} from '@/lib/dsg/deterministic/encoding-proof-store';
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
  applyRateLimit,
  buildRateLimitHeaders,
  getRateLimitKey,
} from '@/lib/security/rate-limit';
import { handleApiError } from '@/lib/security/api-error';

export const runtime = 'nodejs';

const ENCODING_TYPES = new Set<EncodingType>(['qubo-v1', 'ising-v1']);

function responseHeaders(req: Request, rateLimitHeaders?: Record<string, string>): Record<string, string> {
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  return {
    'x-request-id': requestId,
    ...rateLimitHeaders,
  };
}

function proofResponse(
  req: Request,
  proof: EncodingProof,
  rateLimitHeaders: Record<string, string>,
  replayed = false,
): NextResponse<EncodingProveResponse> {
  return NextResponse.json(
    {
      ok: proof.status === 'PASS',
      status: proof.status,
      proofId: proof.proofId,
      encodingHash: proof.encodingHash,
      proofHash: proof.proofHash,
      previousProofHash: proof.previousProofHash,
      requestHash: proof.subject.requestHash,
      replayed,
      proof,
    },
    {
      status: proof.status === 'BLOCK' ? 422 : 200,
      headers: {
        ...responseHeaders(req, rateLimitHeaders),
        'X-Proof-ID': proof.proofId,
        'X-Encoding-Hash': proof.encodingHash,
        'X-Proof-Hash': proof.proofHash,
        'X-Proof-Chain-Prev': proof.previousProofHash,
        'X-Proof-Replayed': String(replayed),
      },
    },
  );
}

function validateRequestBody(body: unknown):
  | { ok: true; value: EncodingProveRequest }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  const candidate = body as Record<string, unknown>;
  if (typeof candidate.problemId !== 'string' || candidate.problemId.trim().length === 0) {
    return { ok: false, error: 'problemId is required' };
  }
  if (typeof candidate.encodingType !== 'string' || !ENCODING_TYPES.has(candidate.encodingType as EncodingType)) {
    return { ok: false, error: 'encodingType must be qubo-v1 or ising-v1' };
  }
  if (!candidate.encoding || typeof candidate.encoding !== 'object' || Array.isArray(candidate.encoding)) {
    return { ok: false, error: 'encoding must be an object' };
  }
  if (typeof candidate.nonce !== 'string' || candidate.nonce.trim().length < 8) {
    return { ok: false, error: 'nonce must be at least 8 characters' };
  }
  if (typeof candidate.idempotencyKey !== 'string' || candidate.idempotencyKey.trim().length < 8) {
    return { ok: false, error: 'idempotencyKey must be at least 8 characters' };
  }

  return {
    ok: true,
    value: {
      problemId: candidate.problemId.trim(),
      encodingType: candidate.encodingType as EncodingType,
      encoding: candidate.encoding as ProblemEncoding,
      nonce: candidate.nonce.trim(),
      idempotencyKey: candidate.idempotencyKey.trim(),
    },
  };
}

export async function POST(req: NextRequest) {
  const startMs = Date.now();
  let rateLimitHeaders: Record<string, string> = {};

  try {
    const caller = await requireDsgAuth(req, ['gate:evaluate']);
    if (!caller.ok) return dsgAuthError(caller);

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
        { status: 402, headers: responseHeaders(req) },
      );
    }

    const rateKey = getRateLimitKey(req, `encoding-proof:${caller.orgId}`);
    const rateResult = await applyRateLimit(rateKey, 60, 60_000);
    rateLimitHeaders = buildRateLimitHeaders(rateResult, 60);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { ok: false, error: 'rate_limit_exceeded', status: 'BLOCK' },
        { status: 429, headers: responseHeaders(req, rateLimitHeaders) },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_request_format',
          status: 'BLOCK',
          failureReasons: ['Request body must be valid JSON'],
        } satisfies EncodingProveErrorResponse,
        { status: 400, headers: responseHeaders(req, rateLimitHeaders) },
      );
    }

    const requestValidation = validateRequestBody(body);
    if (!requestValidation.ok) {
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
    const message = String(error);
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
    if (message.includes('encoding_proof_store:')) {
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
