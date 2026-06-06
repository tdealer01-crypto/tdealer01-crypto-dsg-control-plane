import { createHmac } from 'node:crypto';

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
