import { createHash } from 'crypto';
import type { RuntimeBlockReason, RuntimeExecutionGateResult, RuntimeGateInput } from './types';

export const RUNTIME_GATE_INVARIANTS = [
  'approval_seal',
  'secret_bound',
  'executor_ready',
  'proof_complete',
  'handoff_schema_valid',
] as const;

const CURRENT_SCHEMA = 'v1.runtime-handoff-draft';

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

function sha256(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function block(invariant: string, expected: string, actual: string): RuntimeBlockReason {
  return { invariant, expected, actual, severity: 'HARD' };
}

function checkApprovalSeal(input: RuntimeGateInput): RuntimeBlockReason[] {
  const failures: RuntimeBlockReason[] = [];
  if (input.approval.status !== 'APPROVED') failures.push(block('approval_seal', 'status=APPROVED', `status=${input.approval.status || 'MISSING'}`));
  if (input.approval.signatureValid !== true) failures.push(block('approval_seal', 'signatureValid=true', `signatureValid=${String(input.approval.signatureValid)}`));
  return failures;
}

function checkSecretBound(input: RuntimeGateInput): RuntimeBlockReason[] {
  const failures: RuntimeBlockReason[] = [];
  const missing = input.secrets.requiredSecrets.filter((secret) => !input.secrets.availableSecrets.includes(secret));
  if (!input.secrets.exists) failures.push(block('secret_bound', 'exists=true', 'exists=false'));
  if (input.secrets.expired) failures.push(block('secret_bound', 'expired=false', 'expired=true'));
  if (missing.length) failures.push(block('secret_bound', 'all required secrets available', `missing=${missing.join(',')}`));
  return failures;
}

function checkExecutorReady(input: RuntimeGateInput): RuntimeBlockReason[] {
  const failures: RuntimeBlockReason[] = [];
  if (input.executorPool.available < 1) failures.push(block('executor_ready', 'available>=1', `available=${input.executorPool.available}`));
  if (input.executorPool.health !== 'HEALTHY') failures.push(block('executor_ready', 'health=HEALTHY', `health=${input.executorPool.health}`));
  if (input.executorPool.mode === 'vercel-serverless-gate-only') failures.push(block('executor_ready', 'mode=external-executor', 'mode=vercel-serverless-gate-only'));
  return failures;
}

function checkProofComplete(input: RuntimeGateInput): RuntimeBlockReason[] {
  const failures: RuntimeBlockReason[] = [];
  const missing = input.proofBundle.requiredFields.filter((field) => !input.proofBundle.presentFields.includes(field));
  if (missing.length) failures.push(block('proof_complete', 'all required proof fields present', `missing=${missing.join(',')}`));
  if (!input.proofBundle.hashChainValid) failures.push(block('proof_complete', 'hashChainValid=true', 'hashChainValid=false'));
  return failures;
}

function checkHandoffSchema(input: RuntimeGateInput): RuntimeBlockReason[] {
  const handoff = input.handoff as unknown as Record<string, unknown>;
  const schemaVersion = typeof handoff.schemaVersion === 'string' ? handoff.schemaVersion : undefined;
  const integrityHash = typeof handoff.integrityHash === 'string' ? handoff.integrityHash : undefined;
  const failures: RuntimeBlockReason[] = [];

  if (schemaVersion !== CURRENT_SCHEMA) failures.push(block('handoff_schema_valid', `schemaVersion=${CURRENT_SCHEMA}`, `schemaVersion=${schemaVersion || 'MISSING'}`));

  const recomputed = sha256({
    ready: input.handoff.ready,
    status: input.handoff.status,
    jobId: input.handoff.jobId,
    workspaceId: input.handoff.workspaceId,
    planHash: input.handoff.planHash,
    approvalHash: input.handoff.approvalHash,
    allowedActions: input.handoff.allowedActions,
    blockedActions: input.handoff.blockedActions,
    claimBoundary: input.handoff.claimBoundary,
    schemaVersion,
  });

  if (integrityHash !== recomputed) failures.push(block('handoff_schema_valid', `integrityHash=${recomputed.slice(0, 16)}...`, `integrityHash=${(integrityHash || 'MISSING').slice(0, 16)}...`));
  return failures;
}

export function evaluateRuntimeExecutionGate(input: RuntimeGateInput): RuntimeExecutionGateResult {
  const failures: RuntimeBlockReason[] = [
    ...checkApprovalSeal(input),
    ...checkSecretBound(input),
    ...checkExecutorReady(input),
    ...checkProofComplete(input),
    ...checkHandoffSchema(input),
  ];

  const status = failures.length ? 'BLOCKED' : 'READY';
  const gateHash = sha256(input);
  const timestamp = new Date().toISOString();
  const immutableRecordHash = sha256({ timestamp, gateHash, invariants: RUNTIME_GATE_INVARIANTS, failures, status });

  return {
    ok: true,
    status,
    pass: status === 'READY',
    failures,
    gateHash,
    audit: {
      timestamp,
      gateHash,
      immutableRecordHash,
      invariantsEvaluated: [...RUNTIME_GATE_INVARIANTS],
      failures,
      finalStatus: status,
    },
    boundary: {
      claimStatus: 'RUNTIME_EXECUTION_GATE_ONLY',
      runtimeExecutionStarted: false,
      productionReadyClaim: false,
      executorMode: input.executorPool.mode,
    },
  };
}
