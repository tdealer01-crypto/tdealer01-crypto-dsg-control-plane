export type MemoryKind =
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

export type MemoryStatus =
  | 'active'
  | 'stale'
  | 'conflicted'
  | 'redacted'
  | 'blocked'
  | 'deleted';

export type MemorySourceType =
  | 'conversation'
  | 'agent_step'
  | 'approval'
  | 'command_output'
  | 'test_output'
  | 'deployment_log'
  | 'manual_note'
  | 'system_event';

export type MemoryTrustLevel =
  | 'observed'
  | 'verified'
  | 'user_supplied'
  | 'system_generated'
  | 'unverified';

export type MemoryGateStatus = 'PASS' | 'BLOCK' | 'REVIEW' | 'UNSUPPORTED';

export type MemoryUsePurpose =
  | 'planning'
  | 'approval_review'
  | 'runtime_execution'
  | 'verification'
  | 'completion_report'
  | 'support';

export type DsgMemoryEvent = {
  id: string;
  workspaceId: string;
  jobId?: string;
  actorId: string;
  actorRole: string;

  sourceType: MemorySourceType;
  memoryKind: MemoryKind;

  rawText: string;
  normalizedSummary?: string;

  trustLevel: MemoryTrustLevel;
  status: MemoryStatus;

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

export type MemoryRetrievalScope = {
  workspaceId: string;
  jobId?: string;
  projectId?: string;
  actorId: string;
  purpose: MemoryUsePurpose;

  allowedMemoryKinds?: MemoryKind[];
  includeStale?: boolean;
  includeConflicted?: boolean;
  requireVerifiedEvidence?: boolean;
};

export type MemoryGateResult = {
  status: MemoryGateStatus;
  reasons: string[];
  allowedMemoryIds: string[];
  blockedMemoryIds: string[];
  reviewMemoryIds: string[];
};

export type MemoryContextPack = {
  id: string;
  workspaceId: string;
  jobId?: string;
  actorId: string;
  purpose: MemoryUsePurpose;
  memoryIds: string[];
  contextText: string;
  contextHash: string;
  gateStatus: MemoryGateStatus;
  gateReasons: string[];
  evidenceIds: string[];
  auditIds: string[];
  createdAt: string;
};

export type MemoryPermission =
  | 'memory:read'
  | 'memory:write'
  | 'memory:gate'
  | 'memory:context_pack'
  | 'memory:read_secret'
  | 'memory:read_pii'
  | 'evidence:read'
  | 'evidence:write'
  | 'audit:write';
