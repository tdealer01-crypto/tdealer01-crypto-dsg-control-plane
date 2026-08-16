import { NextResponse } from 'next/server';
import { applyRunEvent } from '@/lib/dsg-one/run/state-machine';
import { advanceRun } from '@/lib/dsg-one/run/orchestrator';
import { getRun, saveRun } from '@/lib/dsg-one/run/repository';
import { isRunTransitionError, runPhase } from '@/lib/dsg-one/run/types';
import {
  applyRateLimit,
  buildRateLimitHeaders,
  getRateLimitKey,
} from '@/lib/security/rate-limit';
import { readJsonBody } from '@/lib/security/request-json';
import { requireDsgAuth, dsgAuthError, logDsgApiCall } from '@/lib/dsg/auth/require-dsg-auth';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = 60;

function actorId(caller: { actorType: 'user' | 'api_key'; userId?: string; apiKeyId?: string }) {
  return caller.actorType === 'api_key' ? `key:${caller.apiKeyId}` : `user:${caller.userId}`;
}

/**
 * POST /api/dsg/v1/runs/:runId/approve — Approve & Run.
 *
 * The single approval in the product. It freezes the planHash and then, per
 * layer 3 of the spec, immediately verifies and dispatches the first step
 * rather than asking again. `{ decision: 'reject' }` cancels the run instead.
 *
 * The response carries `dispatch`: the step the caller should now execute. When
 * it is null the run already settled — the gate blocked something, or every
 * step needs review — and the caller has nothing to do.
 */
export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const caller = await requireDsgAuth(request);
  if (!caller.ok) return dsgAuthError(caller as typeof caller & { ok: false });

  const { runId } = await params;
  const startMs = Date.now();

  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, `dsg-one-approve:${caller.orgId}`),
    limit: RATE_LIMIT,
    windowMs: 60_000,
  });
  const headers = buildRateLimitHeaders(rateLimit, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false, error: 'rate_limit_exceeded' }, { status: 429, headers });
  }

  const body = await readJsonBody<{ decision?: unknown }>(request, { maxBytes: 4_000 });
  if (!body.ok) {
    return NextResponse.json({ ok: false, error: body.error }, { status: body.status, headers });
  }
  const reject = body.value?.decision === 'reject';

  try {
    const run = await getRun(runId, caller.orgId);
    if (!run) {
      return NextResponse.json({ ok: false, error: 'run_not_found' }, { status: 404, headers });
    }

    const at = new Date().toISOString();
    const decided = reject
      ? applyRunEvent(run, { type: 'REJECT', at })
      : applyRunEvent(run, { type: 'APPROVE', approvedBy: actorId(caller), at });

    if (isRunTransitionError(decided)) {
      return NextResponse.json(
        { ok: false, error: decided.code, message: decided.message },
        { status: 409, headers },
      );
    }

    if (reject) {
      await saveRun(decided.run);
      return NextResponse.json(
        { ok: true, run: decided.run, dispatch: null, phase: runPhase(decided.run) },
        { headers },
      );
    }

    // Layer 3: no second gate in front of work the user just approved.
    const advanced = await advanceRun(decided.run, {
      connectedSystems: decided.run.connectedSystems,
      auditAvailable: decided.run.auditAvailable,
    });

    await saveRun(advanced.run);

    await logDsgApiCall({
      route: 'runs/approve',
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
        planHash: advanced.run.planHash,
        dispatch: advanced.dispatch,
        phase: runPhase(advanced.run),
      },
      { headers },
    );
  } catch (error) {
    return handleApiError('dsg-one/runs:approve', error, { headers });
  }
}
