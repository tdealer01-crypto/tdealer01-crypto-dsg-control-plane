import type { DsgRuntimeHandoffDraft } from '@/lib/dsg/app-builder/approval/types';

export type RuntimeExecutionGateStatus = 'BLOCKED' | 'READY' | 'EXECUTING';
export type RuntimeExecutionGateSeverity = 'HARD' | 'SOFT';

export type RuntimeBlockReason = {
  invariant: string;
  expected: string;
  actual: string;
  severity: RuntimeExecutionGateSeverity;
};

export type RuntimeApprovalSeal = {
  status?: string;
  signatureValid?: boolean;
};

export type RuntimeSecretBinding = {
  exists: boolean;
  expired: boolean;
  requiredSecrets: string[];
  availableSecrets: string[];
};

export type RuntimeExecutorPool = {
  available: number;
  health: 'HEALTHY' | 'UNHEALTHY' | 'NOT_CONFIGURED';
  mode: 'vercel-serverless-gate-only' | 'external-executor';
};

export type RuntimeProofBundle = {
  requiredFields: string[];
  presentFields: string[];
  hashChainValid: boolean;
};

export type RuntimeGateInput = {
  handoff: DsgRuntimeHandoffDraft;
  approval: RuntimeApprovalSeal;
  secrets: RuntimeSecretBinding;
  executorPool: RuntimeExecutorPool;
  proofBundle: RuntimeProofBundle;
};

export type RuntimeGateAuditLog = {
  timestamp: string;
  gateHash: string;
  immutableRecordHash: string;
  invariantsEvaluated: string[];
  failures: RuntimeBlockReason[];
  finalStatus: RuntimeExecutionGateStatus;
};

export type RuntimeExecutionGateResult = {
  ok: true;
  status: RuntimeExecutionGateStatus;
  pass: boolean;
  failures: RuntimeBlockReason[];
  gateHash: string;
  audit: RuntimeGateAuditLog;
  boundary: {
    claimStatus: 'RUNTIME_EXECUTION_GATE_ONLY';
    runtimeExecutionStarted: false;
    productionReadyClaim: false;
    executorMode: RuntimeExecutorPool['mode'];
  };
};
