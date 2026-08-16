import { NextResponse } from 'next/server';
import { getRun } from '@/lib/dsg-one/run/repository';
import { runPhase } from '@/lib/dsg-one/run/types';
import { requireDsgAuth, dsgAuthError } from '@/lib/dsg/auth/require-dsg-auth';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dsg/v1/runs/:runId — Live Verification (product layer 4).
 *
 * The polling endpoint behind the progress display. It returns the run, the
 * single phase word to show, and — when a step is waiting on the executor —
 * which step that is.
 *
 * `blockedReason` is the plain sentence the spec requires: when something
 * fails, say what failed and what to fix, not "some checks may have issues".
 */
export async function GET(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const caller = await requireDsgAuth(request);
  if (!caller.ok) return dsgAuthError(caller as typeof caller & { ok: false });

  const { runId } = await params;

  try {
    const run = await getRun(runId, caller.orgId);
    if (!run) {
      return NextResponse.json({ ok: false, error: 'run_not_found' }, { status: 404 });
    }

    const awaiting = run.steps.find((step) => step.status === 'DISPATCHED') ?? null;
    const failed = run.steps.find(
      (step) => step.status === 'BLOCKED' || step.status === 'REVIEW',
    );

    return NextResponse.json({
      ok: true,
      run,
      phase: runPhase(run),
      awaitingStepId: awaiting?.stepId ?? null,
      blockedReason: failed?.judgement?.message ?? null,
    });
  } catch (error) {
    return handleApiError('dsg-one/runs:get', error);
  }
}
