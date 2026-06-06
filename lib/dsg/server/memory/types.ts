/**
 * DSG persistent memory types.
 *
 * A memory event is durable context captured from conversations and other
 * sources. Memory is context, not evidence: it can inform planning but must
 * never override current user input, verified evidence, database truth, or
 * permission gates.
 */

/** Category of a memory event, used for retrieval and gating. */
export type DsgMemoryKind =
  | 'requirement'
  | 'workflow'
  | 'risk'
  | 'evidence'
  | 'policy'
  | 'project_context';

/** Where the memory originated. */
export type DsgMemorySourceType =
  | 'conversation'
  | 'document'
  | 'system'
  | 'import'
  | 'agent';

/** How much the memory content can be trusted by default. */
export type DsgMemoryTrustLevel =
  | 'user_supplied'
  | 'system_generated'
  | 'verified_evidence'
  | 'untrusted';

/** Lifecycle status of a memory row. */
export type DsgMemoryStatus = 'active' | 'conflicted' | 'archived' | 'rejected';

/**
 * Payload accepted by `ingestMemory`. Identity, workspace, and audit fields are
 * supplied by the repository from the request context; everything else is the
 * caller-provided content and classification.
 */
export type DsgMemoryIngestInput = {
  memoryKind: DsgMemoryKind;
  sourceType: DsgMemorySourceType;
  rawText: string;
  normalizedSummary: string;
  trustLevel: DsgMemoryTrustLevel;
  status: DsgMemoryStatus;
  containsSecret: boolean;
  containsPii: boolean;
  containsLegalClaim: boolean;
  containsProductionClaim: boolean;
  contentHash: string;
  metadata?: Record<string, unknown>;
};

/** A stored memory event row. */
export type DsgMemoryEvent = {
  id: string;
  workspaceId: string;
  actorId: string;
  memoryKind: DsgMemoryKind;
  sourceType: DsgMemorySourceType;
  rawText: string;
  normalizedSummary: string;
  trustLevel: DsgMemoryTrustLevel;
  status: DsgMemoryStatus;
  containsSecret: boolean;
  containsPii: boolean;
  containsLegalClaim: boolean;
  containsProductionClaim: boolean;
  contentHash: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};
