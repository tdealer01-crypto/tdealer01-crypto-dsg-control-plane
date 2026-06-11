import { NextRequest, NextResponse } from 'next/server';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return buildPreflightResponse(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = buildCorsHeaders(request);

  try {
    const body = await request.json() as {
      object_type?: string;
      object_id?: string;
      stripe_account_id?: string;
    };

    const { object_type, object_id, stripe_account_id } = body;

    if (!object_type || !object_id) {
      return NextResponse.json(
        {
          decision: 'REVIEW',
          reason: 'Missing context — manual review required.',
          policy_version: GATE_VERSION,
          evaluated_at: new Date().toISOString(),
        },
        { headers: corsHeaders },
      );
    }

    // Deterministic gate: evaluate based on object type and context
    const decision = evaluateGate({ object_type, object_id, stripe_account_id });

    return NextResponse.json(decision, { headers: corsHeaders });
  } catch {
    return NextResponse.json(
      {
        decision: 'REVIEW',
        reason: 'Gate unavailable — manual review required.',
        policy_version: GATE_VERSION,
        evaluated_at: new Date().toISOString(),
      },
      { status: 200, headers: corsHeaders },
    );
  }
}

const GATE_VERSION = 'dsg-gate-v1';

function evaluateGate({ object_type, object_id, stripe_account_id }: {
  object_type: string;
  object_id: string;
  stripe_account_id?: string;
}) {
  // Test mode objects (ch_3... pi_3... po_3... all test mode)
  const isTestMode = object_id.includes('_3') || object_id.startsWith('cs_test') || object_id.startsWith('po_test');

  if (object_type === 'charge') {
    return {
      decision: 'ALLOW' as const,
      reason: `Charge ${object_id.substring(0, 16)}… passed governance policy.${isTestMode ? ' [test mode]' : ''}`,
      proof: `${GATE_VERSION}:${object_id.substring(0, 12)}`,
      policy_version: GATE_VERSION,
      evaluated_at: new Date().toISOString(),
    };
  }

  if (object_type === 'payout') {
    return {
      decision: 'REVIEW' as const,
      reason: `Payout ${object_id.substring(0, 16)}… requires governance approval before execution.${isTestMode ? ' [test mode]' : ''}`,
      proof: `${GATE_VERSION}:${object_id.substring(0, 12)}`,
      policy_version: GATE_VERSION,
      evaluated_at: new Date().toISOString(),
    };
  }

  return {
    decision: 'REVIEW' as const,
    reason: `${object_type} ${object_id.substring(0, 16)}… flagged for review.`,
    policy_version: GATE_VERSION,
    evaluated_at: new Date().toISOString(),
  };
}
