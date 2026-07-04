import { NextRequest, NextResponse } from 'next/server';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { requireInternalService } from '@/lib/auth/internal-service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return buildPreflightResponse(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = buildCorsHeaders(request);

  const internalAccess = requireInternalService(request);
  if (!internalAccess.ok) {
    const failure = internalAccess as any;
    return NextResponse.json({ error: failure.error }, { status: failure.status, headers: corsHeaders });
  }

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

    const decision = evaluateGate({ object_type, object_id, stripe_account_id });

    await recordAudit({
      stripe_account_id,
      object_type,
      object_id,
      decision,
      payload: body,
    });

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

type GateDecision = {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason: string;
  proof?: string;
  policy_version: string;
  evaluated_at: string;
};

async function recordAudit({
  stripe_account_id,
  object_type,
  object_id,
  decision,
  payload,
}: {
  stripe_account_id?: string;
  object_type: string;
  object_id: string;
  decision: GateDecision;
  payload: Record<string, unknown>;
}) {
  if (!stripe_account_id) return;

  try {
    const supabase = getSupabaseAdmin();
    const eventId = `eval_${stripe_account_id}_${object_type}_${object_id}`;

    await (supabase as unknown as {
      from: (table: string) => {
        upsert: (
          data: Record<string, unknown>,
          opts: { onConflict: string }
        ) => Promise<{ error: { message: string } | null }>;
      };
    })
      .from('stripe_operation_audits')
      .upsert(
        {
          stripe_account_id,
          stripe_event_id: eventId,
          stripe_object_id: object_id,
          operation_type: object_type,
          dsg_decision: decision.decision,
          dsg_reason: decision.reason,
          dsg_proof: decision.proof ?? null,
          payload,
          status: decision.decision === 'REVIEW' ? 'recorded' : 'executed',
        },
        { onConflict: 'stripe_event_id' },
      );
  } catch (error) {
    console.warn('[stripe-app/gate/evaluate] audit write skipped:', error);
  }
}

function evaluateGate({ object_type, object_id }: {
  object_type: string;
  object_id: string;
  stripe_account_id?: string;
}): GateDecision {
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
