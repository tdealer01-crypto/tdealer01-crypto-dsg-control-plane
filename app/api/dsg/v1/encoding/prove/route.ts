/**
 * Encoding Proof Gate API Route
 * POST /api/dsg/v1/encoding/prove
 *
 * Validates QUBO/Ising encodings and generates encoding proofs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createEncodingProof } from '@/lib/dsg/deterministic/encoding-proof-engine';
import {
  ProblemEncoding,
  EncodingProveRequest,
  EncodingProveSuccessResponse,
  EncodingProveErrorResponse,
} from '@/lib/dsg/deterministic/encoding-proof-types';

export const dynamic = 'force-dynamic';

/**
 * Validate request payload structure
 */
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

/**
 * Validate encoding structure
 */
function validateEncoding(encoding: any): { valid: boolean; error?: string } {
  if (!Number.isInteger(encoding.variableCount) || encoding.variableCount <= 0) {
    return { valid: false, error: 'variableCount must be a positive integer' };
  }

  const kind = encoding.kind;
  if (!kind || !['qubo-v1', 'ising-v1'].includes(kind)) {
    return { valid: false, error: 'encoding.kind must be "qubo-v1" or "ising-v1"' };
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

/**
 * POST /api/dsg/v1/encoding/prove
 *
 * Request body:
 * {
 *   "problemId": "string",
 *   "encodingType": "qubo-v1" | "ising-v1",
 *   "encoding": { ... },
 *   "nonce": "string",
 *   "idempotencyKey": "string"
 * }
 *
 * Response: EncodingProveResponse
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    let data: any;
    try {
      data = await req.json();
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_request_body',
          status: 'BLOCK',
          failureReasons: ['Request body must be valid JSON'],
        } satisfies EncodingProveErrorResponse,
        { status: 400 }
      );
    }

    // Validate request structure
    const requestValidation = validateRequest(data);
    if (!requestValidation.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_request_format',
          status: 'BLOCK',
          failureReasons: [requestValidation.error || 'Invalid request format'],
        } satisfies EncodingProveErrorResponse,
        { status: 400 }
      );
    }

    // Validate encoding structure
    const encodingValidation = validateEncoding(data.encoding);
    if (!encodingValidation.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_encoding_structure',
          status: 'BLOCK',
          failureReasons: [encodingValidation.error || 'Invalid encoding structure'],
        } satisfies EncodingProveErrorResponse,
        { status: 400 }
      );
    }

    // Create encoding proof
    const encoding = data.encoding as ProblemEncoding;
    const proof = createEncodingProof(encoding);

    // Return success response
    if (proof.status === 'PASS') {
      return NextResponse.json(
        {
          ok: true,
          proofId: proof.proofId,
          status: proof.status,
          proof,
        } satisfies EncodingProveSuccessResponse,
        {
          status: 200,
          headers: {
            'X-Proof-ID': proof.proofId,
            'X-Encoding-Hash': proof.encodingHash,
          },
        }
      );
    }

    // Return block/review response
    return NextResponse.json(
      {
        ok: false,
        error: 'encoding_validation_failed',
        status: proof.status,
        failedChecks: proof.failedChecks,
        failureReasons: proof.failureReasons,
      } satisfies EncodingProveErrorResponse,
      { status: proof.status === 'BLOCK' ? 422 : 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        error: 'internal_server_error',
        status: 'BLOCK',
        failureReasons: [message],
      } satisfies EncodingProveErrorResponse,
      { status: 500 }
    );
  }
}
