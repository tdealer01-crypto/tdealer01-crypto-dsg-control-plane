import { NextResponse } from 'next/server';
import { proveDeterministicPlan } from '../../../../../../lib/dsg/deterministic/proof-engine';
import type { DeterministicProofRequest } from '../../../../../../lib/dsg/deterministic/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Partial<DeterministicProofRequest> | null;

  if (!body || !body.context || typeof body.context !== 'object') {
    return NextResponse.json({ ok: false, error: 'missing_context' }, { status: 400 });
  }

  const proof = proveDeterministicPlan({
    planId: body.planId,
    policyRef: body.policyRef,
    policyVersion: body.policyVersion,
    riskLevel: body.riskLevel,
    previousProofHash: body.previousProofHash,
    context: body.context,
  });

  return NextResponse.json({
    ok: proof.status === 'PASS',
    type: 'dsg-deterministic-proof',
    proof,
    boundary: {
      statement: 'DSG-native deterministic proof adapter. External Z3 solver is not invoked by this route.',
      externalSolverInvoked: false,
      productionReadyClaim: false,
    },
  });
}
