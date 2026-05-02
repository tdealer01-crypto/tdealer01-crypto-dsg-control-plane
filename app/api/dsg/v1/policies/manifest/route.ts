import { NextResponse } from 'next/server';
import { getDeterministicPolicyManifest } from '../../../../../../lib/dsg/deterministic/policy-manifest';
import { getDeterministicSolverMetadata } from '../../../../../../lib/dsg/deterministic/solver-metadata';

export const dynamic = 'force-dynamic';

export async function GET() {
  const manifest = getDeterministicPolicyManifest();
  const solver = getDeterministicSolverMetadata();

  return NextResponse.json({
    ok: true,
    type: 'dsg-deterministic-policy-manifest',
    manifest,
    solver,
    boundary: {
      statement: 'Policy version and constraintSetHash are included in every deterministic proof. Solver metadata is resolved from runtime configuration.',
      externalSolverInvoked: solver.externalSolverInvoked,
      productionReadyClaim: false,
    },
  });
}
