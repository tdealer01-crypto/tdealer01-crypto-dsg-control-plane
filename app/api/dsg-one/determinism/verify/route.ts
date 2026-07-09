/**
 * POST /api/dsg-one/determinism/verify
 *
 * Verify that a deterministic sequence is authentic (not tampered).
 * Checks:
 * - Chain hash integrity (links to previous entries)
 * - Decision hash authenticity
 * - Hash recomputation matches stored hash
 *
 * Returns detailed verification result.
 */

import { NextResponse } from 'next/server';
import { verifySequence } from '@/lib/dsg-one/determinism-engine';

export const dynamic = 'force-dynamic';

interface VerifyRequest {
  orgId: string;
  sequenceNumber: string; // Can be stringified bigint
}

export async function POST(request: Request) {
  try {
    const body: VerifyRequest = await request.json();

    if (!body.orgId || !body.sequenceNumber) {
      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_REQUEST',
          details: 'Missing required fields: orgId, sequenceNumber',
        },
        { status: 400 }
      );
    }

    const sequenceNumber = BigInt(body.sequenceNumber);

    // Verify the sequence
    const result = await verifySequence(body.orgId, sequenceNumber);

    return NextResponse.json(
      {
        ok: result.ok,
        sequenceNumber: body.sequenceNumber,
        verified: result.ok,
        error: result.error || null,
        message: result.ok
          ? `Sequence #${body.sequenceNumber} verified successfully - no tampering detected`
          : `Sequence #${body.sequenceNumber} verification failed: ${result.error}`,
      },
      { status: result.ok ? 200 : 400 }
    );
  } catch (error) {
    console.error('POST /api/dsg-one/determinism/verify failed:', error instanceof Error ? error.stack : error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to verify decision integrity',
      },
      { status: 500 }
    );
  }
}
