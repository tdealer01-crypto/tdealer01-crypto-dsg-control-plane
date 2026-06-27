import { NextResponse } from "next/server";
import { getDeterministicPolicyManifest } from "../../../../../../lib/dsg/deterministic/policy-manifest";
import { getDeterministicSolverMetadata } from "../../../../../../lib/dsg/deterministic/solver-metadata";

export const dynamic = "force-dynamic";

export async function GET() {
  const manifest = getDeterministicPolicyManifest();
  const solver = getDeterministicSolverMetadata();

  return NextResponse.json({
    ok: true,
    type: "dsg-deterministic-policy-manifest",
    manifest,
    solver,
    boundary: {
      statement:
        "Policy version, constraintSetHash, constraint inventory, and solver metadata are present for deterministic proof generation. This is a manifest readiness claim, not a full marketplace launch claim.",
      externalSolverInvoked: solver.externalSolverInvoked,
      productionReadyClaim: Boolean(
        manifest.policyRef &&
        manifest.policyVersion &&
        manifest.constraintSetHash &&
        manifest.constraints.length > 0 &&
        solver.version,
      ),
    },
  });
}
