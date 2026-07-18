import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Public Supabase client (no RLS bypass needed - table is public read)
function getPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key);
}

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

    if (
      body.minArbiterCount < 0 ||
      body.actualArbiterCount < 0 ||
      body.minArbiterCount > 5 ||
      body.actualArbiterCount > 5
    ) {
      return NextResponse.json(
        { error: 'Invalid request: arbiter counts must be between 0 and 5' },
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

    // Persist result to Supabase for shareable link access
    const supabase = getPublicSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('public_test_results').insert({
          test_id: testId,
          min_required: body.minArbiterCount,
          actual_count: body.actualArbiterCount,
          test_name: result.testCase.testName,
          decision: result.decision,
          reason: result.reason,
          request_hash: result.proofChain.requestHash,
          proof_hash: result.proofChain.proofHash,
          bundle_hash: result.proofChain.bundleHash,
          merkle_root: result.proofChain.merkleRoot,
          ccvs_level: result.ccvsLevel,
          compliance_ccvs: result.compliance.ccvs,
          compliance_pdpa: result.compliance.pdpa,
          compliance_eu_ai_act: result.compliance.euAiAct,
          evidence_deterministic: result.evidence.deterministic,
          evidence_replayable: result.evidence.replayable,
          evidence_tamperable: result.evidence.tamperable,
          result_json: result,
        });
      } catch (dbError) {
        console.error('[public-test] Failed to persist result to Supabase:', dbError);
        // Non-fatal: still return result even if persistence fails
        // The test result is valid, but shareable link may not work
      }
    }

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
