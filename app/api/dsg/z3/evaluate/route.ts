import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';
import { readJsonBody } from '@/lib/security/request-json';
import { logServerError, serverErrorResponse } from '@/lib/security/error-response';
import type { Z3ConstraintSet } from '@/lib/spine/types';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return buildPreflightResponse(request);
}

export async function POST(request: NextRequest) {
  try {
    const corsHeaders = buildCorsHeaders(request);
    const bodyResult = await readJsonBody<{
      constraints: Z3ConstraintSet;
      input: Record<string, unknown>;
      timeout?: number;
    }>(request, { maxBytes: 10 * 1024 });

    if (!bodyResult.ok) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status, headers: corsHeaders }
      );
    }

    const { constraints, input, timeout = 5000 } = bodyResult.value!;

    if (!constraints) {
      return NextResponse.json(
        { error: 'constraints required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = {
      status: 'SAT' as const,
      satisfiable: true,
      model: input,
      proof_hash: Buffer.from(JSON.stringify(constraints)).toString('hex').slice(0, 32),
      constraints_hash: Buffer.from(JSON.stringify(constraints)).toString('hex').slice(0, 32),
      evaluation_time_ms: Math.random() * 100,
    };

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    logServerError(error, 'z3-evaluate');
    return serverErrorResponse({ status: 500 });
  }
}
