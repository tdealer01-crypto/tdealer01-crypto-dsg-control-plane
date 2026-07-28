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
  const all = store.snapshot();
  const latest = all.length > 0 ? all[all.length - 1] : null;

  return NextResponse.json(
    {
      latest,
      count: all.length,
      runs: all,
    },
    { headers: corsHeaders }
  );
}
