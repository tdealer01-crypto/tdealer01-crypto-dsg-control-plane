import { describe, expect, it } from 'vitest';

import {
  assertMemoryCannotOverrideEvidence,
  evaluateMemoryGate,
} from '../../lib/dsg/memory/memory-gate';
import type { DsgMemoryEvent } from '../../lib/dsg/memory/types';

function memory(overrides: Partial<DsgMemoryEvent> = {}): DsgMemoryEvent {
  return {
    id: 'memory-1',
    workspaceId: 'workspace-1',
    jobId: 'job-1',
    actorId: 'actor-1',
    actorRole: 'operator',
    sourceType: 'conversation',
    memoryKind: 'claim',
    rawText: 'Prior conversation claimed deployment passed.',
    normalizedSummary: undefined,
    trustLevel: 'user_supplied',
    status: 'active',
    containsSecret: false,
    containsPii: false,
    containsLegalClaim: false,
    containsProductionClaim: false,
    sourceEvidenceId: undefined,
    sourceAuditId: undefined,
    contentHash: 'hash-1',
    metadata: {},
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-05-04T00:00:00.000Z',
    ...overrides,
  };
}

describe('DSG governed memory gate', () => {
  it('blocks all memory when workspace scope is missing', () => {
    const result = evaluateMemoryGate({
      memories: [memory()],
      scope: {
        workspaceId: '',
        actorId: 'actor-1',
        purpose: 'planning',
      },
      actorPermissions: ['memory:read'],
    });

    expect(result.status).toBe('BLOCK');
    expect(result.blockedMemoryIds).toEqual(['memory-1']);
  });

  it('blocks secret memory without secret read permission', () => {
    const result = evaluateMemoryGate({
      memories: [memory({ containsSecret: true })],
      scope: {
        workspaceId: 'workspace-1',
        actorId: 'actor-1',
        purpose: 'planning',
      },
      actorPermissions: ['memory:read'],
    });

    expect(result.status).toBe('BLOCK');
    expect(result.blockedMemoryIds).toEqual(['memory-1']);
  });

  it('routes PII memory to review without PII permission', () => {
    const result = evaluateMemoryGate({
      memories: [memory({ containsPii: true })],
      scope: {
        workspaceId: 'workspace-1',
        actorId: 'actor-1',
        purpose: 'planning',
      },
      actorPermissions: ['memory:read'],
    });

    expect(result.status).toBe('REVIEW');
    expect(result.reviewMemoryIds).toEqual(['memory-1']);
  });

  it('blocks unverified production claim memory when evidence is required', () => {
    const result = evaluateMemoryGate({
      memories: [
        memory({
          containsProductionClaim: true,
          trustLevel: 'user_supplied',
        }),
      ],
      scope: {
        workspaceId: 'workspace-1',
        actorId: 'actor-1',
        purpose: 'completion_report',
        requireVerifiedEvidence: true,
      },
      actorPermissions: ['memory:read'],
    });

    expect(result.status).toBe('BLOCK');
    expect(result.blockedMemoryIds).toEqual(['memory-1']);
  });

  it('blocks memory from replacing missing current evidence', () => {
    const result = assertMemoryCannotOverrideEvidence({
      memory: memory({ id: 'memory-prod-claim' }),
      hasCurrentEvidence: false,
      evidenceStatus: 'MISSING',
    });

    expect(result.status).toBe('BLOCK');
    expect(result.blockedMemoryIds).toEqual(['memory-prod-claim']);
  });

  it('passes verified memory only when current evidence passes', () => {
    const result = assertMemoryCannotOverrideEvidence({
      memory: memory({ id: 'memory-verified', trustLevel: 'verified' }),
      hasCurrentEvidence: true,
      evidenceStatus: 'PASS',
    });

    expect(result.status).toBe('PASS');
    expect(result.allowedMemoryIds).toEqual(['memory-verified']);
  });
});
