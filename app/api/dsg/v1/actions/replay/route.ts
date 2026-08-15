import { NextResponse } from 'next/server';
import { runCanonicalActionFromSurface } from '@/lib/mcp/canonical-action-adapter';
import type { UnifiedAuthContext } from '@/lib/mcp/unified-auth';
import { validateVerifiedActionRequest } from '@/lib/dsg-one/verified-action-request';
import {
  checkReceiptIntegrity,
  replayVerifiedAction,
  VERIFIED_ACTION_RECEIPT_SCHEMA,
  type VerifiedActionReceipt,
} from '@/lib/dsg-one/verified-action-receipt';
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

export const dynamic = 'force-dynamic';

function isReceipt(value: unknown): value is VerifiedActionReceipt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.schema === VERIFIED_ACTION_RECEIPT_SCHEMA &&
    typeof candidate.receiptId === 'string' &&
    typeof candidate.chain === 'object' &&
    candidate.chain !== null
  );
}

/**
 * POST /api/dsg/v1/actions/replay — independently re-verify a receipt.
 *
 * Two modes, both free of charge because replay is what makes a receipt worth
 * paying for and charging to check your own evidence would defeat that:
 *
 *   1. receipt only            -> integrity check (was the document altered?)
 *   2. receipt + original request -> full replay (does the chain still produce
 *                                    the same hashes and the same verdict?)
 *
 * Mode 2 is the measurable claim: provider, model, or orchestration drift shows
 * up as a per-field hash mismatch instead of silently passing.
 */
export async function POST(request: Request) {
  const caller = await requireDsgAuth(request);
  if (!caller.ok) return dsgAuthError(caller as typeof caller & { ok: false });

  const startMs = Date.now();

  const rateLimitResult = await applyRateLimit({
    key: getRateLimitKey(request, `dsg-action-replay:${caller.orgId}`),
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

  const body = await readJsonBody(request, { maxBytes: 96_000 });
  if (!body.ok) {
    return NextResponse.json(
      { ok: false, error: body.error },
      { status: body.status, headers: rateLimitHeaders },
    );
  }

  const payload = body.value as Record<string, unknown>;
  if (!isReceipt(payload?.receipt)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'validation_failed',
        details: [
          { field: 'receipt', message: `must be a ${VERIFIED_ACTION_RECEIPT_SCHEMA} document` },
        ],
      },
      { status: 400, headers: rateLimitHeaders },
    );
  }

  const receipt = payload.receipt;
  const integrity = checkReceiptIntegrity(receipt);

  // Mode 1: no original request supplied — report integrity only, and say so
  // rather than letting the caller read it as a full replay.
  if (payload.request === undefined) {
    const durationMs = Date.now() - startMs;
    void logDsgApiCall({
      orgId: caller.orgId,
      actorType: caller.actorType,
      apiKeyId: caller.actorType === 'api_key' ? caller.apiKeyId : undefined,
      userId: caller.actorType === 'user' ? caller.userId : undefined,
      route: 'actions/replay',
      statusCode: 200,
      gateStatus: integrity.intact ? 'INTACT' : 'ALTERED',
      proofId: receipt.receiptId,
      durationMs,
    });

    return NextResponse.json(
      {
        ok: true,
        type: 'dsg-verified-action-integrity',
        mode: 'integrity-only',
        receiptId: receipt.receiptId,
        receiptIntact: integrity.intact,
        reason: integrity.intact
          ? 'Receipt contents hash to the presented receiptId.'
          : integrity.reason,
        replayPerformed: false,
        note: 'Supply the original verify request as `request` to replay the chain and compare every hash.',
      },
      { headers: rateLimitHeaders },
    );
  }

  const validated = validateVerifiedActionRequest(payload.request);
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

  const fresh = await runCanonicalActionFromSurface(
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

  const replay = replayVerifiedAction(receipt, fresh.result);
  const durationMs = Date.now() - startMs;

  void logDsgApiCall({
    orgId: caller.orgId,
    actorType: caller.actorType,
    apiKeyId: caller.actorType === 'api_key' ? caller.apiKeyId : undefined,
    userId: caller.actorType === 'user' ? caller.userId : undefined,
    route: 'actions/replay',
    statusCode: 200,
    gateStatus: replay.replayMatch ? 'REPLAY_MATCH' : 'REPLAY_MISMATCH',
    proofId: receipt.receiptId,
    durationMs,
  });

  return NextResponse.json(
    {
      ok: true,
      type: 'dsg-verified-action-replay',
      mode: 'full-replay',
      receiptId: receipt.receiptId,
      replayMatch: replay.replayMatch,
      receiptIntact: replay.receiptIntact,
      verdictMatch: replay.verdictMatch,
      comparedFields: replay.comparedFields,
      mismatchedFields: replay.mismatchedFields,
      fields: replay.fields,
      reason: replay.reason,
      boundary:
        'Replay re-runs the canonical chain over the same inputs and compares hashes. It does not re-execute the action against any live system.',
    },
    { headers: rateLimitHeaders },
  );
}
