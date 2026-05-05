import { NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { getBearerToken } from '@/lib/dsg/server/supabase-rpc';
import { getRuntimeJob, recordReplayProof, writeEvidence } from '@/lib/dsg/server/repository';
import { runAuthRbacProof } from '@/lib/dsg/runtime/auth-rbac-proof';

type TrustedAuthRbacProofConfig = {
  previewUrl?: string;
  routes: Array<{ path: string; kind: 'public' | 'protected' | 'admin' }>;
  authRequired?: boolean;
  rbacRequired?: boolean;
  oauthFlow?: 'none' | 'manual_only';
  hasTestIdentity?: boolean;
  signals?: { fakeCookie?: boolean; fakeRoleHeader?: boolean; callerBooleans?: boolean };
};

function readTrustedAuthRbacConfig(metadata: Record<string, unknown>): TrustedAuthRbacProofConfig | null {
  const candidates: unknown[] = [
    metadata.authRbacProofConfig,
    metadata.authProofConfig,
    metadata.planMetadata,
    metadata.plan,
  ];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const source = candidate as Record<string, unknown>;
    const config = (source.authRbacProofConfig ?? source.authProofConfig ?? source) as Record<string, unknown>;
    if (!Array.isArray(config.routes)) continue;
    return {
      previewUrl: typeof config.previewUrl === 'string' ? config.previewUrl : undefined,
      routes: config.routes as TrustedAuthRbacProofConfig['routes'],
      authRequired: config.authRequired === true,
      rbacRequired: config.rbacRequired === true,
      oauthFlow: config.oauthFlow === 'manual_only' ? 'manual_only' : 'none',
      hasTestIdentity: config.hasTestIdentity === true,
      signals: typeof config.signals === 'object' && config.signals ? (config.signals as TrustedAuthRbacProofConfig['signals']) : undefined,
    };
  }
  return null;
}

export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const actor = await requireVerifiedDsgActor(request.headers, 'replay:verify');
  const { jobId } = await context.params;
  const repoCtx = { workspaceId: actor.workspaceId, actorId: actor.actorId, userAccessToken: getBearerToken(request.headers) };
  const job = await getRuntimeJob(repoCtx, jobId);
  const trustedConfig = readTrustedAuthRbacConfig((job.metadata ?? {}) as Record<string, unknown>);
  if (!trustedConfig || trustedConfig.routes.length === 0) {
    return NextResponse.json({ ok: false, error: { code: 'DSG_AUTH_RBAC_PROOF_CONFIG_REQUIRED_SERVER_METADATA' } }, { status: 403 });
  }

  const proof = await runAuthRbacProof(trustedConfig);

  try {
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
