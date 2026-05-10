import { createHash } from 'node:crypto';

export type RepairLoopAttempt = {
  attemptNo: number;
  failedCommand: string;
  diagnosis: string;
  patchRef: string;
  retryCommand: string;
  result: 'PASS' | 'FAIL' | 'STOP';
};

export type RepairLoopProof = {
  jobId: string;
  maxAttempts: number;
  attempts: RepairLoopAttempt[];
  stopReason: string;
};

export type RepairLoopResult = {
  ok: boolean;
  status: 'PASS' | 'PROOF_REQUIRED' | 'BLOCKED';
  missing: string[];
  proofHash: string;
  nextAction: string;
};

function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function evaluateRepairLoopProof(proof?: Partial<RepairLoopProof>): RepairLoopResult {
  const missing: string[] = [];
  if (!proof?.jobId) missing.push('jobId');
  if (typeof proof?.maxAttempts !== 'number' || proof.maxAttempts < 1 || proof.maxAttempts > 5) missing.push('maxAttempts_1_to_5');
  if (!proof?.attempts?.length) missing.push('attempts');
  if (!proof?.stopReason) missing.push('stopReason');

  for (const attempt of proof?.attempts ?? []) {
    if (!attempt.failedCommand) missing.push(`attempt_${attempt.attemptNo}_failedCommand`);
    if (!attempt.diagnosis) missing.push(`attempt_${attempt.attemptNo}_diagnosis`);
    if (!attempt.patchRef) missing.push(`attempt_${attempt.attemptNo}_patchRef`);
    if (!attempt.retryCommand) missing.push(`attempt_${attempt.attemptNo}_retryCommand`);
  }

  const ok = missing.length === 0 && Boolean(proof?.attempts?.some((attempt) => attempt.result === 'PASS'));
  return {
    ok,
    status: ok ? 'PASS' : missing.length ? 'PROOF_REQUIRED' : 'BLOCKED',
    missing,
    proofHash: hash({ proof, missing, ok }),
    nextAction: ok ? 'Attach repair proof to the job timeline.' : 'Run a bounded repair attempt from sandbox failure evidence.',
  };
}
