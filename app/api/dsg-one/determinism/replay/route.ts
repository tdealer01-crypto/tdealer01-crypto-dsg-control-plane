/**
 * POST /api/dsg-one/determinism/replay
 *
 * Replay a policy decision with original inputs.
 * Proves determinism: if output is same, system made same decision.
 *
 * Use case:
 * - Auditor wants to verify decision wasn't random
 * - Replay with same request → should get same decision hash
 * - If hashes match: DETERMINISTIC ✓
 * - If hashes differ: System is non-deterministic (red flag!)
 *
 * Enterprise value:
 * - Proves compliance: "We make the same decision for same input"
 * - Audit trail: "Decision was deterministic, not influenced by factors we can't control"
 * - Replay capability: "We can re-verify any past decision"
 */

import { NextResponse } from 'next/server';
import { replaySequence } from '@/lib/dsg-one/determinism-engine';
import type { PolicyExecutionRequest, PolicyExecutionDecision } from '@/lib/dsg-one/determinism-engine';

export const dynamic = 'force-dynamic';

interface ReplayRequest {
  orgId: string;
  sequenceNumber: string;
  policyRequest: PolicyExecutionRequest;
  policyDecision: PolicyExecutionDecision;
}

export async function POST(request: Request) {
  try {
    const body: ReplayRequest = await request.json();

    if (
      !body.orgId ||
      !body.sequenceNumber ||
      !body.policyRequest ||
      !body.policyDecision
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_REQUEST',
          details: 'Missing required fields: orgId, sequenceNumber, policyRequest, policyDecision',
        },
        { status: 400 }
      );
    }

    const sequenceNumber = BigInt(body.sequenceNumber);

    // Replay the sequence
    const result = await replaySequence(
      body.orgId,
      sequenceNumber,
      body.policyRequest,
      body.policyDecision
    );

    if (result.error) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          isDeterministic: false,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        sequenceNumber: body.sequenceNumber,
        isDeterministic: result.isDeterministic,
        message: result.isDeterministic
          ? `Sequence #${body.sequenceNumber} is DETERMINISTIC: same input produces same decision ✓`
          : `Sequence #${body.sequenceNumber} is NON-DETERMINISTIC: same input produces different decision ⚠️`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST /api/dsg-one/determinism/replay failed:', error instanceof Error ? error.stack : error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to replay decision verification',
        isDeterministic: false,
      },
      { status: 500 }
    );
  }
}
