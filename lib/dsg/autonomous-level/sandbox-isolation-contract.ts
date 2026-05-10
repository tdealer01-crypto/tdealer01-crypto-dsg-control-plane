import { createHash } from 'node:crypto';

export type SandboxIsolationProof = {
  providerId: string;
  jobId: string;
  command: string;
  exitCode: number;
  durationMs: number;
  artifactRefs: string[];
  logRef: string;
};

export type SandboxIsolationResult = {
  ok: boolean;
  status: 'PASS' | 'PROOF_REQUIRED' | 'BLOCKED';
  missing: string[];
  proofHash: string;
  nextAction: string;
};

function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function evaluateSandboxIsolationProof(proof?: Partial<SandboxIsolationProof>): SandboxIsolationResult {
  const missing: string[] = [];
  if (!proof?.providerId) missing.push('providerId');
  if (!proof?.jobId) missing.push('jobId');
  if (!proof?.command) missing.push('command');
  if (typeof proof?.exitCode !== 'number') missing.push('exitCode');
  if (typeof proof?.durationMs !== 'number') missing.push('durationMs');
  if (!proof?.logRef) missing.push('logRef');
  if (!proof?.artifactRefs?.length) missing.push('artifactRefs');

  const ok = missing.length === 0 && proof?.exitCode === 0;
  return {
    ok,
    status: ok ? 'PASS' : missing.length ? 'PROOF_REQUIRED' : 'BLOCKED',
    missing,
    proofHash: hash({ proof, missing, ok }),
    nextAction: ok ? 'Attach sandbox proof to the job timeline.' : 'Run commands inside a real isolated provider and attach logs/artifacts.',
  };
}
