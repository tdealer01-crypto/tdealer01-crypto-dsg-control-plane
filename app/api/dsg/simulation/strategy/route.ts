import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';
import { getSimulationStore } from '@/lib/deeptutor/production-simulator';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return buildPreflightResponse(request);
}

export async function GET() {
  const corsHeaders = buildCorsHeaders({} as NextRequest);
  const store = getSimulationStore();
  const latest = store.getLatestStrategy();

  if (!latest) {
    return NextResponse.json(
      { error: 'no_strategy_yet', hint: 'POST /api/dsg/simulation/run first' },
      { status: 404, headers: corsHeaders }
    );
  }

  return NextResponse.json(latest, { headers: corsHeaders });
}
