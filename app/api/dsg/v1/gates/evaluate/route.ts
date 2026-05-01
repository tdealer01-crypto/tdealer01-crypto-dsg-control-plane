import { NextResponse } from 'next/server';
import { evaluateDeterministicGate } from '../../../../../../lib/dsg/deterministic/gate-engine';
import type { DeterministicProofRequest } from '../../../../../../lib/dsg/deterministic/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Partial<DeterministicProofRequest> | null;

  if (!body || !body.context || typeof body.context !== 'object') {
    return NextResponse.json({ ok: false, error: 'missing_context' }, { status: 400 });
  }

  const result = evaluateDeterministicGate({
    planId: body.planId,
    policyRef: body.policyRef,
    policyVersion: body.policyVersion,
    riskLevel: body.riskLevel,
    previousProofHash: body.previousProofHash,
    context: body.context,
  });

  return NextResponse.json({
    ok: result.ok,
    type: 'dsg-deterministic-gate-decision',
    gateStatus: result.gateStatus,
    proofStatus: result.proofStatus,
    riskLevel: result.riskLevel,
    reason: result.reason ?? null,
    proof: result.proof,
    boundary: {
      statement: 'DSG-native deterministic gate adapter. UNSUPPORTED is never PASS. External Z3 solver is not invoked by this route.',
      externalSolverInvoked: false,
      productionReadyClaim: false,
    },
  });
}
