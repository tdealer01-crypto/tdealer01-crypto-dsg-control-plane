import { NextResponse } from 'next/server';
import { compilePlan, listSupportedIntents } from '@/lib/dsg-one/run/plan-lock';
import { computePlanHash } from '@/lib/dsg-one/run/state-machine';
import { createRun, listRuns } from '@/lib/dsg-one/run/repository';
import { runPhase } from '@/lib/dsg-one/run/types';
import type { VerifiedActionSurface } from '@/lib/dsg-one/verified-action-receipt';
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
const RATE_WINDOW_MS = 60_000;
const SURFACES: VerifiedActionSurface[] = ['api', 'unify', 'trinity-mcp'];

function actorId(caller: { actorType: 'user' | 'api_key'; userId?: string; apiKeyId?: string }) {
  return caller.actorType === 'api_key' ? `key:${caller.apiKeyId}` : `user:${caller.userId}`;
}

/**
 * POST /api/dsg/v1/runs — Plan Lock (product layer 1).
 *
 * Compiles an intent into a checkable plan and stores it as a DRAFT run. No
 * planHash is frozen here and nothing is dispatched: the run is inert until the
 * user approves it, which is what makes the approval mean something.
 *
 * The response includes the hash the plan *would* freeze to, so a client can
 * show the user exactly what they are about to commit to.
 */
export async function POST(request: Request) {
  const caller = await requireDsgAuth(request);
  if (!caller.ok) return dsgAuthError(caller as typeof caller & { ok: false });

  const startMs = Date.now();

  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, `dsg-one-runs:${caller.orgId}`),
    limit: RATE_LIMIT,
    windowMs: RATE_WINDOW_MS,
  });
  const headers = buildRateLimitHeaders(rateLimit, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false, error: 'rate_limit_exceeded' }, { status: 429, headers });
  }

  const body = await readJsonBody<{
    intent?: unknown;
    surface?: unknown;
    connectedSystems?: unknown;
    auditAvailable?: unknown;
  }>(request, { maxBytes: 16_000 });
  if (!body.ok) {
    return NextResponse.json({ ok: false, error: body.error }, { status: body.status, headers });
  }

  const intent = typeof body.value?.intent === 'string' ? body.value.intent : '';
  const surfaceInput = body.value?.surface;
  const surface: VerifiedActionSurface =
    typeof surfaceInput === 'string' && SURFACES.includes(surfaceInput as VerifiedActionSurface)
      ? (surfaceInput as VerifiedActionSurface)
      : 'api';

  const connectedSystems = Array.isArray(body.value?.connectedSystems)
    ? body.value.connectedSystems.filter((value): value is string => typeof value === 'string')
    : [];
  const auditAvailable = body.value?.auditAvailable === true;

  const compiled = compilePlan(intent);
  if (!compiled.ok || !compiled.plan) {
    return NextResponse.json(
      {
        ok: false,
        error: 'plan_not_compilable',
        message: compiled.reason,
        supportedIntents: listSupportedIntents(),
      },
      { status: 422, headers },
    );
  }

  try {
    const run = await createRun({
      orgId: caller.orgId,
      actorId: actorId(caller),
      surface,
      plan: compiled.plan,
      templateId: compiled.templateId,
      connectedSystems,
      auditAvailable,
    });

    await logDsgApiCall({
      route: 'runs/create',
      orgId: caller.orgId,
      actorType: caller.actorType,
      userId: caller.userId,
      apiKeyId: caller.apiKeyId,
      statusCode: 201,
      durationMs: Date.now() - startMs,
    });

    return NextResponse.json(
      {
        ok: true,
        run,
        // What approving would freeze. Shown next to the Approve & Run button so
        // the user can see the plan identity before they commit to it.
        pendingPlanHash: computePlanHash(run.plan),
        phase: runPhase(run),
      },
      { status: 201, headers },
    );
  } catch (error) {
    return handleApiError('dsg-one/runs:create', error, { headers });
  }
}

/** GET /api/dsg/v1/runs — Activity. Recent runs for the caller's org. */
export async function GET(request: Request) {
  const caller = await requireDsgAuth(request);
  if (!caller.ok) return dsgAuthError(caller as typeof caller & { ok: false });

  const limitParam = new URL(request.url).searchParams.get('limit');
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 25;

  try {
    const runs = await listRuns(caller.orgId, Number.isFinite(limit) ? limit : 25);
    return NextResponse.json({
      ok: true,
      runs: runs.map((run) => ({
        runId: run.runId,
        status: run.status,
        phase: runPhase(run),
        intent: run.plan.intent,
        planHash: run.planHash,
        receiptId: run.receiptId,
        stepCount: run.steps.length,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
      })),
    });
  } catch (error) {
    return handleApiError('dsg-one/runs:list', error);
  }
}
