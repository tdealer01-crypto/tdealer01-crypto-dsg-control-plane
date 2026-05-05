import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/dsg/server/repository', () => ({
  writeEvidence: vi.fn(async () => ({ id: 'ev1' })),
  recordReplayProof: vi.fn(async () => ({ id: 'rp1' })),
}));

import { POST } from '@/app/api/dsg/runtime/build-proof/callback/route';
import { computeBuildProofHash } from '@/lib/dsg/server/build-proof';
import { recordReplayProof } from '@/lib/dsg/server/repository';

const basePayload = {
  jobId: 'job-1',
  branch: 'feat/x',
  treeHash: 'sha256:tree',
  githubRunId: '123',
  githubSha: 'abc',
  status: 'success',
};

function signedRequest(payload: unknown, secret: string) {
  const body = JSON.stringify(payload);
  const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
  return new Request('http://localhost/api/dsg/runtime/build-proof/callback', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dsg-signature': signature },
    body,
  });
}

describe('build proof callback route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.DSG_CALLBACK_SECRET = 'secret';
    process.env.DSG_CALLBACK_WORKSPACE_ID = 'ws';
    process.env.DSG_CALLBACK_ACTOR_ID = 'actor';
    process.env.DSG_CALLBACK_USER_ACCESS_TOKEN = 'token';
  });

  it('rejects missing signature', async () => {
    const res = await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(basePayload) }));
    expect(res.status).toBe(401);
  });

  it('rejects invalid signature', async () => {
    const res = await POST(new Request('http://localhost', { method: 'POST', headers: { 'x-dsg-signature': 'sha256=deadbeef' }, body: JSON.stringify(basePayload) }));
    expect(res.status).toBe(401);
  });

  it('rejects missing payload fields', async () => {
    const res = await POST(signedRequest({ jobId: 'x' }, 'secret'));
    expect(res.status).toBe(400);
  });

  it('records FAILED for failed workflow status', async () => {
    const res = await POST(signedRequest({ ...basePayload, status: 'failed' }, 'secret'));
    expect(res.status).toBe(201);
    expect(recordReplayProof).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'FAILED' }));
  });

  it('records BUILD_VERIFIED for success status', async () => {
    const res = await POST(signedRequest(basePayload, 'secret'));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.buildStatus).toBe('BUILD_VERIFIED');
    expect(recordReplayProof).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'PASS' }));
  });

  it('proof hash deterministic', () => {
    const one = computeBuildProofHash(basePayload);
    const two = computeBuildProofHash(basePayload);
    expect(one).toBe(two);
  });
});
