import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';
import { logServerError, serverErrorResponse } from '@/lib/security/error-response';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return buildPreflightResponse(request);
}

export async function GET(_request: NextRequest) {
  const corsHeaders = buildCorsHeaders(_request);
  return NextResponse.json(
    {
      ok: true,
      service: 'z3-plugin-redirect',
      note: 'Redirecting plugin-manifest paths to /api/dsg/z3/* and /api/dsg/simulation/*',
      routes: {
        policies: '/api/dsg/z3/policies',
        evaluate: '/api/dsg/z3/evaluate',
        prove: '/api/dsg/z3/prove',
        verifyPlan: '/api/dsg/z3/verify-plan',
        adapt: '/api/dsg/simulation/run',
        simulate: '/api/dsg/simulation/run',
        replay: '/api/dsg/simulation/state',
      },
    },
    { headers: corsHeaders }
  );
}

export async function POST(request: NextRequest) {
  try {
    const corsHeaders = buildCorsHeaders(request);
    return NextResponse.json(
      {
        ok: true,
        service: 'z3-plugin-redirect',
        note: 'Use /api/dsg/z3/* and /api/dsg/simulation/*',
        routes: {
          policies: '/api/dsg/z3/policies',
          evaluate: '/api/dsg/z3/evaluate',
          prove: '/api/dsg/z3/prove',
          verifyPlan: '/api/dsg/z3/verify-plan',
          adapt: '/api/dsg/simulation/run',
          simulate: '/api/dsg/simulation/run',
          replay: '/api/dsg/simulation/state',
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    logServerError(error, 'z3-redirect');
    return serverErrorResponse({ status: 500 });
  }
}
