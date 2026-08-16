import { NextResponse } from 'next/server';
import { applyRunEvent, judgeObservation } from '@/lib/dsg-one/run/state-machine';
import { advanceRun } from '@/lib/dsg-one/run/orchestrator';
import { getRun, saveRun } from '@/lib/dsg-one/run/repository';
import { isRunTransitionError, runPhase, type StepObservation } from '@/lib/dsg-one/run/types';
import {
  applyRateLimit,
  buildRateLimitHeaders,
  getRateLimitKey,
} from '@/lib/security/rate-limit';
import { readJsonBody } from '@/lib/security/request-json';
import { requireDsgAuth, dsgAuthError, logDsgApiCall } from '@/lib/dsg/auth/require-dsg-auth';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = 120;

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/**
 * POST /api/dsg/v1/runs/:runId/steps/:stepId/observe — Observe (layer 4).
 *
 * The client executor reports what it actually did. DSG judges that report
 * against the locked plan and either advances to the next step or stops the run.
 *
 * The executor's own `outcome` is never taken at face value: an observation
 * carrying the wrong planHash, touching a system outside the approved scope, or
 * producing no evidence is stopped regardless of what it claims about itself.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string; stepId: string }> },
) {
  const caller = await requireDsgAuth(request);
  if (!caller.ok) return dsgAuthError(caller as typeof caller & { ok: false });

  const { runId, stepId } = await params;
  const startMs = Date.now();

  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, `dsg-one-observe:${caller.orgId}`),
    limit: RATE_LIMIT,
    windowMs: 60_000,
  });
  const headers = buildRateLimitHeaders(rateLimit, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false, error: 'rate_limit_exceeded' }, { status: 429, headers });
  }

  const body = await readJsonBody<Record<string, unknown>>(request, { maxBytes: 64_000 });
  if (!body.ok) {
    return NextResponse.json({ ok: false, error: body.error }, { status: body.status, headers });
  }

  const raw = body.value ?? {};
  if (typeof raw.planHash !== 'string' || raw.planHash.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'validation_failed', details: ['planHash is required'] },
      { status: 400, headers },
    );
  }
  if (raw.outcome !== 'SUCCEEDED' && raw.outcome !== 'FAILED') {
    return NextResponse.json(
      { ok: false, error: 'validation_failed', details: ["outcome must be 'SUCCEEDED' or 'FAILED'"] },
      { status: 400, headers },
    );
  }

  const observation: StepObservation = {
    planHash: raw.planHash,
    executedCommands: toStringArray(raw.executedCommands),
    changedPaths: toStringArray(raw.changedPaths),
    evidenceIds: toStringArray(raw.evidenceIds),
    outcome: raw.outcome,
    detail: typeof raw.detail === 'string' ? raw.detail : undefined,
  };

  try {
    const run = await getRun(runId, caller.orgId);
    if (!run) {
      return NextResponse.json({ ok: false, error: 'run_not_found' }, { status: 404, headers });
    }

    const step = run.steps.find((candidate) => candidate.stepId === stepId);
    if (!step) {
      return NextResponse.json({ ok: false, error: 'step_not_found' }, { status: 404, headers });
    }

    const at = new Date().toISOString();
    const judgement = judgeObservation(run, step, observation);

    const observed = applyRunEvent(run, { type: 'STEP_OBSERVED', stepId, judgement, at });
    if (isRunTransitionError(observed)) {
      return NextResponse.json(
        { ok: false, error: observed.code, message: observed.message },
        { status: 409, headers },
      );
    }

    // Keep the raw observation on the step so the receipt and any later replay
    // can show what was reported, not only how it was judged.
    const withObservation = {
      ...observed.run,
      steps: observed.run.steps.map((candidate) =>
        candidate.stepId === stepId ? { ...candidate, observation } : candidate,
      ),
    };

    const advanced = await advanceRun(withObservation, {
      connectedSystems: run.connectedSystems,
      auditAvailable: run.auditAvailable,
    });

    await saveRun(advanced.run);

    await logDsgApiCall({
      route: 'runs/observe',
      orgId: caller.orgId,
      actorType: caller.actorType,
      userId: caller.userId,
      apiKeyId: caller.apiKeyId,
      statusCode: 200,
      durationMs: Date.now() - startMs,
    });

    return NextResponse.json(
      {
        ok: true,
        run: advanced.run,
        judgement,
        dispatch: advanced.dispatch,
        phase: runPhase(advanced.run),
      },
      { headers },
    );
  } catch (error) {
    return handleApiError('dsg-one/runs:observe', error, { headers });
  }
}
