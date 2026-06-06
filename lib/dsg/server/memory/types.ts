export type DsgMemorySourceType =
  | 'conversation'
  | 'agent_step'
  | 'approval'
  | 'command_output'
  | 'test_output'
  | 'deployment_log'
  | 'manual_note'
  | 'system_event';

export type DsgMemoryKind =
  | 'policy'
  | 'decision'
  | 'preference'
  | 'requirement'
  | 'risk'
  | 'command'
  | 'evidence'
  | 'workflow'
  | 'project_context'
  | 'claim'
  | 'unknown';

export type DsgMemoryTrustLevel = 'observed' | 'verified' | 'user_supplied' | 'system_generated' | 'unverified';
export type DsgMemoryStatus = 'active' | 'stale' | 'conflicted' | 'redacted' | 'blocked' | 'deleted';
export type DsgMemoryGateStatus = 'PASS' | 'REVIEW' | 'BLOCK' | 'UNSUPPORTED';
export type DsgMemoryPurpose = 'planning' | 'approval_review' | 'runtime_execution' | 'verification' | 'completion_report' | 'support';

export type DsgMemoryEvent = {
  id: string;
  workspaceId: string;
  jobId?: string;
  actorId: string;
  actorRole: string;
  sourceType: DsgMemorySourceType;
  memoryKind: DsgMemoryKind;
  rawText: string;
  normalizedSummary?: string;
  trustLevel: DsgMemoryTrustLevel;
  status: DsgMemoryStatus;
  containsSecret: boolean;
  containsPii: boolean;
  containsLegalClaim: boolean;
  containsProductionClaim: boolean;
  sourceEvidenceId?: string;
  sourceAuditId?: string;
  contentHash: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type DsgMemoryScope = {
  purpose: DsgMemoryPurpose;
  jobId?: string;
  requireVerifiedEvidence?: boolean;
};

export type DsgMemoryGateResult = {
  status: DsgMemoryGateStatus;
  reasons: string[];
  allowedMemoryIds: string[];
  blockedMemoryIds: string[];
  reviewMemoryIds: string[];
};

export type DsgMemoryContextPack = {
  id: string;
  workspaceId: string;
  jobId?: string;
  actorId: string;
  purpose: DsgMemoryPurpose;
  memoryIds: string[];
  contextText: string;
  contextHash: string;
  gateStatus: DsgMemoryGateStatus;
  gateReasons: string[];
  evidenceIds: string[];
  auditIds: string[];
  createdAt: string;
};
