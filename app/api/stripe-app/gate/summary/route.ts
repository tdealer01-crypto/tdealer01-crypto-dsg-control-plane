import { NextRequest, NextResponse } from 'next/server';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return buildPreflightResponse(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = buildCorsHeaders(request);

  try {
    const body = await request.json() as { stripe_account_id?: string };
    const { stripe_account_id } = body;

    if (!stripe_account_id) {
      return NextResponse.json({ allow: 0, review: 0, block: 0 }, { headers: corsHeaders });
    }

    // Scaffold: returns zero counts until persistent audit storage is wired up.
    // When Supabase audit tables are connected, query gate_decisions
    // filtered by stripe_account_id and created_at >= start of today.
    return NextResponse.json(
      {
        allow: 0,
        review: 0,
        block: 0,
        last_decision: null,
      },
      { headers: corsHeaders },
    );
  } catch {
    return NextResponse.json({ allow: 0, review: 0, block: 0 }, { status: 200, headers: corsHeaders });
  }
}
