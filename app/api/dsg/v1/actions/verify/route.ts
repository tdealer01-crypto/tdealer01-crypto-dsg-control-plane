import { NextResponse } from 'next/server';
import { runCanonicalActionFromSurface } from '@/lib/mcp/canonical-action-adapter';
import type { UnifiedAuthContext } from '@/lib/mcp/unified-auth';
import { validateVerifiedActionRequest } from '@/lib/dsg-one/verified-action-request';
import { buildVerifiedActionReceipt } from '@/lib/dsg-one/verified-action-receipt';
import {
  applyRateLimit,
  buildRateLimitHeaders,
  getRateLimitKey,
} from '@/lib/security/rate-limit';
import { readJsonBody } from '@/lib/security/request-json';
import {
  requireDsgAuth,
  dsgAuthError,
  logDsgApiCall,
} from '@/lib/dsg/auth/require-dsg-auth';
import {
  checkGateEntitlement,
  recordGateEvaluation,
} from '@/lib/dsg/gate-entitlement';

export const dynamic = 'force-dynamic';

/**
 * POST /api/dsg/v1/actions/verify — Verified Agent Action.
 *
 * The first HTTP surface over the canonical DSG chain
 * (QUBO -> Ising -> Z3 -> exact proof -> Action IR -> DSG gate ->
 * pre-execution simulation -> evidence -> receipt/replay).
 *
 * Boundary: the caller's runtime executes the action and submits what it
 * observed. This route verifies that observation against the chain and issues a
 * receipt. It never executes anything, so the simulate/execute hooks below are
 * bound to the submitted evidence rather than to any live executor.
 */
export async function POST(request: Request) {
  const caller = await requireDsgAuth(request);
  if (!caller.ok) return dsgAuthError(caller as typeof caller & { ok: false });

  const startMs = Date.now();

  const rateLimitResult = await applyRateLimit({
    key: getRateLimitKey(request, `dsg-verified-action:${caller.orgId}`),
    limit: 60,
    windowMs: 60_000,
  });
  const rateLimitHeaders = buildRateLimitHeaders(rateLimitResult, 60);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { ok: false, error: 'rate_limit_exceeded' },
      { status: 429, headers: rateLimitHeaders },
    );
  }

  const entitlement = await checkGateEntitlement(caller.orgId);
  if (!entitlement.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: entitlement.message,
        requiresUpgrade: entitlement.requiresPayment,
        tier: entitlement.tier,
        accessMode: entitlement.accessMode,
        upgradeUrl: entitlement.upgradeUrl,
      },
      {
        status: entitlement.requiresPayment ? 402 : 503,
        headers: rateLimitHeaders,
      },
    );
  }

  const body = await readJsonBody(request, { maxBytes: 64_000 });
  if (!body.ok) {
    return NextResponse.json(
      { ok: false, error: body.error },
      { status: body.status, headers: rateLimitHeaders },
    );
  }

  const validated = validateVerifiedActionRequest(body.value);
  if (!validated.ok) {
    return NextResponse.json(
      { ok: false, error: 'validation_failed', details: validated.details },
      { status: 400, headers: rateLimitHeaders },
    );
  }

  const req = validated.value;

  const auth: UnifiedAuthContext = {
    source: caller.actorType === 'api_key' ? 'api-key' : 'session',
    actorId: caller.actorType === 'api_key' ? caller.apiKeyId : caller.userId,
    orgId: caller.orgId,
    roles: ['operator'],
  };

  const canonicalResult = await runCanonicalActionFromSurface(
    {
      surface: req.surface,
      sessionId: req.sessionId,
      agentId: req.agentId,
      agentName: req.agentName,
      planContractVerified: req.planContractVerified,
      optimization: req.optimization as never,
      actionSolution: req.actionSolution,
      approval: req.approval,
      audit: req.audit,
      evidence: req.evidence,
    },
    auth,
    {
      simulate: async () => req.observed.simulation,
      execute: async () => req.observed.execution,
    },
  );

  const problemId = String(
    (req.optimization as Record<string, unknown>).problemId ?? '',
  );
  const receipt = buildVerifiedActionReceipt({
    canonicalResult: canonicalResult.result,
    surface: req.surface,
    workspaceId: caller.orgId,
    problemId,
  });

  const durationMs = Date.now() - startMs;

  // Metered on every verified action, PASS or BLOCK: a BLOCK receipt is the
  // product working, not a failed request, and the caller keeps the evidence.
  const usage = await recordGateEvaluation(
    req.idempotencyKey,
    caller.orgId,
    'actions/verify',
    receipt.verdict,
    durationMs,
  );

  if (!usage.recorded) {
    const accessMode = usage.error?.startsWith('delivery_blocked:')
      ? usage.error.slice('delivery_blocked:'.length)
      : 'billing_unavailable';
    const requiresUpgrade =
      accessMode === 'quota_exceeded' || accessMode === 'subscription_inactive';
    return NextResponse.json(
      {
        ok: false,
        error: 'usage_evidence_unavailable',
        accessMode,
        requiresUpgrade,
        message:
          'Receipt withheld because usage evidence could not be recorded safely.',
        upgradeUrl: '/pricing#dsg-gate',
      },
      { status: requiresUpgrade ? 402 : 503, headers: rateLimitHeaders },
    );
  }

  const response = NextResponse.json(
    {
      ok: true,
      type: 'dsg-verified-action',
      receipt,
      canonical: canonicalResult.canonical,
      surface: canonicalResult.surface,
      entitlement: {
        tier: entitlement.tier,
        evalsRemaining: entitlement.evalsRemaining,
        accessMode: entitlement.accessMode,
      },
      caller: { orgId: caller.orgId, actorType: caller.actorType },
      replayWith: '/api/dsg/v1/actions/replay',
      boundary: canonicalResult.boundary,
    },
    { headers: rateLimitHeaders },
  );

  void logDsgApiCall({
    orgId: caller.orgId,
    actorType: caller.actorType,
    apiKeyId: caller.actorType === 'api_key' ? caller.apiKeyId : undefined,
    userId: caller.actorType === 'user' ? caller.userId : undefined,
    route: 'actions/verify',
    statusCode: 200,
    gateStatus: receipt.verdict,
    proofId: receipt.receiptId,
    durationMs,
  });

  return response;
}
