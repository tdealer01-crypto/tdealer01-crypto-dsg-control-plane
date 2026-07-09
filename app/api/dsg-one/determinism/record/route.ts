/**
 * POST /api/dsg-one/determinism/record
 *
 * Records a policy decision with deterministic sequence and verification.
 * Called automatically by policy evaluation engines.
 *
 * Response includes:
 * - Sequence number (proves this is the Nth decision)
 * - Request hash (proves request integrity)
 * - Decision hash (proves decision integrity)
 * - Chain hash (proves no tampering in history)
 * - Replay capability (same input → can re-verify)
 */

import { NextResponse } from 'next/server';
import {
  generateDeterministicSequence,
  recordToDeterminismLedger,
  type PolicyExecutionRequest,
  type PolicyExecutionDecision,
} from '@/lib/dsg-one/determinism-engine';

export const dynamic = 'force-dynamic';

interface RecordDeterminismRequest {
  orgId: string;
  policyId: string;
  requestType: string;
  requestData: Record<string, unknown>;
  requesterId: string;
  requesterRole?: string;
  decision: {
    decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
    reason: string;
    riskScore?: number;
    evidence?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const body: RecordDeterminismRequest = await request.json();

    // Validate required fields
    if (
      !body.orgId ||
      !body.policyId ||
      !body.requestType ||
      !body.requestData ||
      !body.requesterId ||
      !body.decision
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'INVALID_REQUEST',
          details: 'Missing required fields: orgId, policyId, requestType, requestData, requesterId, decision',
        },
        { status: 400 }
      );
    }

    // Construct policy execution request
    const policyRequest: PolicyExecutionRequest = {
      orgId: body.orgId,
      policyId: body.policyId,
      requestType: body.requestType as 'approval' | 'payment' | 'deployment' | 'access',
      requestData: body.requestData,
      requesterId: body.requesterId,
      requesterRole: body.requesterRole,
      metadata: body.metadata,
    };

    // Construct decision
    const policyDecision: PolicyExecutionDecision = {
      decision: body.decision.decision,
      reason: body.decision.reason,
      riskScore: body.decision.riskScore,
      evidence: body.decision.evidence,
    };

    // Generate deterministic sequence
    const sequence = await generateDeterministicSequence(body.orgId, policyRequest, policyDecision);

    // Generate entry ID
    const entryId = `entry-${body.orgId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Record to determinism ledger
    const ledgerEntry = await recordToDeterminismLedger(body.orgId, entryId, sequence, policyDecision);

    // Return deterministic proof
    return NextResponse.json(
      {
        ok: true,
        proof: {
          sequenceNumber: sequence.sequenceNumber.toString(),
          requestHash: sequence.requestHash,
          decisionHash: sequence.decisionHash,
          chainHash: sequence.chainHash,
          entryId: ledgerEntry.entryId,
          verified: ledgerEntry.verified,
          timestamp: sequence.timestamp,
          isReplayable: true,
        },
        message: `Decision #${sequence.sequenceNumber} recorded deterministically`,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('POST /api/dsg-one/determinism/record failed:', errorMessage);

    return NextResponse.json(
      {
        ok: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
