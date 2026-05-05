import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { recordReplayProof, writeEvidence } from '@/lib/dsg/server/repository';

export type BuildProofPayload = {
  jobId: string;
  branch: string;
  treeHash: string;
  githubRunId: string;
  githubSha: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
};

export function computeBuildProofHash(payload: BuildProofPayload): string {
  return createHmac('sha256', 'dsg-build-proof-hash').update(JSON.stringify(payload)).digest('hex');
}

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !header.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const actual = header.slice('sha256='.length);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

function payloadValid(payload: Partial<BuildProofPayload> | null): payload is BuildProofPayload {
  return !!payload?.jobId && !!payload.branch && !!payload.treeHash && !!payload.githubRunId && !!payload.githubSha && !!payload.status;
}

export async function POST(request: Request) {
  const secret = process.env.DSG_CALLBACK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: { code: 'DSG_CALLBACK_SECRET_REQUIRED' } }, { status: 500 });

  const signature = request.headers.get('x-dsg-signature');
  if (!signature) return NextResponse.json({ ok: false, error: { code: 'DSG_CALLBACK_SIGNATURE_REQUIRED' } }, { status: 401 });

  const rawBody = await request.text();
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ ok: false, error: { code: 'DSG_CALLBACK_SIGNATURE_INVALID' } }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as Partial<BuildProofPayload>;
  if (!payloadValid(payload)) {
    return NextResponse.json({ ok: false, error: { code: 'DSG_BUILD_PROOF_PAYLOAD_REQUIRED' } }, { status: 400 });
  }

  const buildStatus = /^(success|pass)$/i.test(payload.status) ? 'BUILD_VERIFIED' : 'FAILED';
  const replayStatus = buildStatus === 'BUILD_VERIFIED' ? 'PASS' : 'FAILED';
  const proofHash = `sha256:${computeBuildProofHash(payload)}`;

  const repoCtx = {
    workspaceId: process.env.DSG_CALLBACK_WORKSPACE_ID ?? '',
    actorId: process.env.DSG_CALLBACK_ACTOR_ID ?? '',
    userAccessToken: process.env.DSG_CALLBACK_USER_ACCESS_TOKEN,
  };

  try {
    const evidence = await writeEvidence(repoCtx, {
      jobId: payload.jobId,
      evidenceType: 'BUILD_PROOF',
      contentHash: proofHash,
      summary: `Build proof callback ${buildStatus}; CI status=${payload.status}`,
      metadata: { ...payload, buildStatus, claimBoundary: 'DSG-6 implements signed build proof callback path.' },
    });

    const replay = await recordReplayProof(repoCtx, {
      jobId: payload.jobId,
      replayHash: proofHash,
      status: replayStatus,
      details: { buildProof: payload, evidenceId: evidence.id, buildStatus },
    });

    return NextResponse.json({ ok: true, data: { buildStatus, evidenceId: evidence.id, replayProofId: replay.id, proofHash } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { code: error instanceof Error ? error.message : 'DSG_BUILD_PROOF_RECORD_FAILED' } }, { status: 403 });
  }
}
