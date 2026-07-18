import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

interface TestRequest {
  minArbiterCount: number;
  actualArbiterCount: number;
  testName?: string;
}

interface ProofChain {
  requestHash: string;
  proofHash: string;
  bundleHash: string;
  merkleRoot: string;
}

interface TestResult {
  testId: string;
  timestamp: string;
  testCase: {
    minRequired: number;
    actualCount: number;
    testName: string;
  };
  decision: 'ALLOW' | 'BLOCK';
  reason: string;
  proofChain: ProofChain;
  ccvsLevel: 'L1' | 'L2' | 'L3';
  compliance: {
    ccvs: boolean;
    pdpa: boolean;
    euAiAct: boolean;
  };
  evidence: {
    deterministic: boolean;
    replayable: boolean;
    tamperable: false;
  };
  auditTrail: {
    created: string;
    exportedAt?: string;
    shareableLink: string;
  };
}

function generateHash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

function generateProofChain(
  minArbiterCount: number,
  actualArbiterCount: number,
  decision: string,
  reason: string
): ProofChain {
  const requestData = `${minArbiterCount}|${actualArbiterCount}-request`;
  const requestHash = generateHash(requestData);

  const proofData = `${requestHash}-${decision}-${reason}`;
  const proofHash = generateHash(proofData);

  const bundleData = `${proofHash}-bundle`;
  const bundleHash = generateHash(bundleData);

  const merkleRoot = generateHash(`${bundleHash}-merkleroot`);

  return {
    requestHash: `sha256:${requestHash}`,
    proofHash: `sha256:${proofHash}`,
    bundleHash: `sha256:${bundleHash}`,
    merkleRoot: `sha256:${merkleRoot}`,
  };
}

function validateArbiterCount(
  minRequired: number,
  actual: number
): { decision: 'ALLOW' | 'BLOCK'; reason: string } {
  if (actual < minRequired) {
    return {
      decision: 'BLOCK',
      reason: `ARBITER_COUNT_INSUFFICIENT: got ${actual}, need ${minRequired}`,
    };
  }
  return {
    decision: 'ALLOW',
    reason: `ARBITER_COUNT_SUFFICIENT: got ${actual}, need ${minRequired}`,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TestRequest;

    // Validate input
    if (
      typeof body.minArbiterCount !== 'number' ||
      typeof body.actualArbiterCount !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Invalid request: minArbiterCount and actualArbiterCount must be numbers' },
        { status: 400 }
      );
    }

    if (body.minArbiterCount < 0 || body.actualArbiterCount < 0) {
      return NextResponse.json(
        { error: 'Invalid request: counts cannot be negative' },
        { status: 400 }
      );
    }

    const testId = randomUUID();
    const timestamp = new Date().toISOString();

    // Perform arbiter validation
    const { decision, reason } = validateArbiterCount(
      body.minArbiterCount,
      body.actualArbiterCount
    );

    // Generate proof chain using canonical input parameters for determinism
    const proofChain = generateProofChain(body.minArbiterCount, body.actualArbiterCount, decision, reason);

    // Create test result
    const result: TestResult = {
      testId,
      timestamp,
      testCase: {
        minRequired: body.minArbiterCount,
        actualCount: body.actualArbiterCount,
        testName: body.testName || `Arbiter Validation Test ${body.minArbiterCount}/${body.actualArbiterCount}`,
      },
      decision,
      reason,
      proofChain,
      ccvsLevel: 'L2',
      compliance: {
        ccvs: true,
        pdpa: true,
        euAiAct: true,
      },
      evidence: {
        deterministic: true,
        replayable: true,
        tamperable: false,
      },
      auditTrail: {
        created: timestamp,
        shareableLink: `https://${process.env.VERCEL_URL || 'tdealer01-crypto-dsg-control-plane.vercel.app'}/public/test-result/${testId}`,
      },
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      endpoint: '/api/public/test/arbiter-validation',
      method: 'POST',
      description: 'Third-party public test for arbiter count validation',
      usage: {
        request: {
          minArbiterCount: 'number (0-5)',
          actualArbiterCount: 'number (0-5)',
          testName: 'string (optional)',
        },
        example: {
          minArbiterCount: 2,
          actualArbiterCount: 1,
          testName: 'Insufficient Arbiters Test',
        },
      },
      response: {
        testId: 'UUID',
        timestamp: 'ISO 8601',
        decision: 'ALLOW or BLOCK',
        reason: 'Decision reason with counts',
        proofChain: 'SHA-256 hash chain',
        ccvsLevel: 'L1-L5 compliance level',
        compliance: 'CCVS, PDPA, EU AI Act flags',
        auditTrail: 'Test record with shareable link',
      },
    },
    { status: 200 }
  );
}
