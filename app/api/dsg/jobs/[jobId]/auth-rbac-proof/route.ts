import { NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { getBearerToken } from '@/lib/dsg/server/supabase-rpc';
import { recordReplayProof, writeEvidence } from '@/lib/dsg/server/repository';
import { runAuthRbacProof } from '@/lib/dsg/runtime/auth-rbac-proof';

export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const actor = await requireVerifiedDsgActor(request.headers, 'replay:verify');
  const { jobId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    previewUrl?: string;
    routes?: Array<{ path: string; kind: 'public' | 'protected' | 'admin' }>;
    authRequired?: boolean;
    rbacRequired?: boolean;
    oauthFlow?: 'none' | 'manual_only';
    hasTestIdentity?: boolean;
    signals?: { fakeCookie?: boolean; fakeRoleHeader?: boolean; callerBooleans?: boolean };
  } | null;

  if (!body?.routes || !Array.isArray(body.routes)) {
    return NextResponse.json({ ok: false, error: { code: 'DSG_AUTH_RBAC_PROOF_INPUT_REQUIRED' } }, { status: 400 });
  }

  const proof = await runAuthRbacProof({
    previewUrl: body.previewUrl,
    routes: body.routes,
    authRequired: body.authRequired,
    rbacRequired: body.rbacRequired,
    oauthFlow: body.oauthFlow,
    hasTestIdentity: body.hasTestIdentity,
    signals: body.signals,
  });

  try {
    const repoCtx = { workspaceId: actor.workspaceId, actorId: actor.actorId, userAccessToken: getBearerToken(request.headers) };
    const evidence = await writeEvidence(repoCtx, {
      jobId,
      evidenceType: 'AUTH_RBAC_PROOF',
      contentHash: proof.proofHash,
      summary: proof.summary,
      metadata: { status: proof.status, routesChecked: proof.routesChecked, hardFailures: proof.hardFailures },
    });

    const replay = await recordReplayProof(repoCtx, {
      jobId,
      replayHash: proof.proofHash,
      status: proof.status === 'PASS' ? 'PASS' : proof.status === 'FAILED' ? 'FAILED' : 'BLOCK',
      details: { authRbac: proof, evidenceId: evidence.id },
    });

    return NextResponse.json({ ok: true, data: { proof, evidenceId: evidence.id, replayProofId: replay.id } }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { code: error instanceof Error ? error.message : 'DSG_AUTH_RBAC_PROOF_RECORD_FAILED' }, proof },
      { status: 403 },
    );
  }
}
