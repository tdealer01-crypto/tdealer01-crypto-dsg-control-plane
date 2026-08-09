import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { runVerifiedRepair } from '@/lib/dsg/verified-repair';
import type { VerifiedRepairRequest } from '@/lib/dsg/verified-repair';

export const dynamic = 'force-dynamic';

/**
 * Plan-only API surface for the Verified Repair Simulator.
 * Repository mutation is deliberately not available through this route;
 * controlled worktree execution is a local/worker boundary.
 */
export async function POST(request: NextRequest) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: { code: 'BODY_REQUIRED' } }, { status: 400 });
  }

  const input: VerifiedRepairRequest = {
    jobId: body.jobId as string,
    finding: body.finding as VerifiedRepairRequest['finding'],
    candidates: body.candidates as VerifiedRepairRequest['candidates'],
    allowedFiles: body.allowedFiles as string[],
    approvals: body.approvals as VerifiedRepairRequest['approvals'],
    solver: body.solver as VerifiedRepairRequest['solver'],
    createdAt: body.createdAt as string | undefined,
    actorId: access.userId,
    source: 'api',
    // The HTTP route is a plan/evidence surface. It never accepts execute=true.
    execute: false,
  };

  const result = await runVerifiedRepair(input);
  return NextResponse.json({
    ok: true,
    data: result,
    truthBoundary: 'This route produces a candidate plan and Z3 evidence only. It does not modify a repository, merge, deploy, or prove a production fix.',
  });
}
export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      endpoint: 'POST /api/dsg/v1/repair/simulate',
      stages: ['candidate_input', 'binary_qubo_plan', 'z3_exact_verification', 'evidence_replay'],
      defaultMode: 'pinned',
      mutation: 'disabled',
      nextStep: 'Run the same verified plan through the local controlled executor with execute=true and validationProfile=full.',
      statuses: {
        READY_FOR_CONTROLLED_EXECUTION: 'Plan passed exact verification and is waiting for the isolated worktree executor.',
        VERIFIED_IN_SIMULATION: 'The isolated worktree validation profile passed; this is not a merge or production claim.',
        BLOCKED: 'The plan, evidence, approval, solver, or exact verification gate failed.',
      },
    },
  });
}
