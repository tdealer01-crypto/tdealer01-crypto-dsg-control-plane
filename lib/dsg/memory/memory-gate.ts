import type {
  DsgMemoryEvent,
  MemoryGateResult,
  MemoryPermission,
  MemoryRetrievalScope,
} from './types';

export type EvaluateMemoryGateInput = {
  memories: DsgMemoryEvent[];
  scope: MemoryRetrievalScope;
  actorPermissions: MemoryPermission[] | string[];
};

function hasPermission(
  permissions: MemoryPermission[] | string[],
  permission: MemoryPermission,
): boolean {
  return permissions.includes(permission);
}

function pushUnique(target: string[], value: string): void {
  if (!target.includes(value)) {
    target.push(value);
  }
}

export function evaluateMemoryGate(
  input: EvaluateMemoryGateInput,
): MemoryGateResult {
  const allowedMemoryIds: string[] = [];
  const blockedMemoryIds: string[] = [];
  const reviewMemoryIds: string[] = [];
  const reasons: string[] = [];

  if (!input.scope.workspaceId) {
    return {
      status: 'BLOCK',
      reasons: ['Memory gate blocked: missing workspace scope.'],
      allowedMemoryIds,
      blockedMemoryIds: input.memories.map((memory) => memory.id),
      reviewMemoryIds,
    };
  }

  if (!input.scope.actorId) {
    return {
      status: 'BLOCK',
      reasons: ['Memory gate blocked: missing actor scope.'],
      allowedMemoryIds,
      blockedMemoryIds: input.memories.map((memory) => memory.id),
      reviewMemoryIds,
    };
  }

  if (!hasPermission(input.actorPermissions, 'memory:read')) {
    return {
      status: 'BLOCK',
      reasons: ['Memory gate blocked: actor lacks memory:read permission.'],
      allowedMemoryIds,
      blockedMemoryIds: input.memories.map((memory) => memory.id),
      reviewMemoryIds,
    };
  }

  for (const memory of input.memories) {
    if (input.scope.allowedMemoryKinds?.length) {
      if (!input.scope.allowedMemoryKinds.includes(memory.memoryKind)) {
        pushUnique(blockedMemoryIds, memory.id);
        reasons.push(
          `Memory ${memory.id} blocked: memory kind ${memory.memoryKind} is outside retrieval scope.`,
        );
        continue;
      }
    }

    if (memory.workspaceId !== input.scope.workspaceId) {
      pushUnique(blockedMemoryIds, memory.id);
      reasons.push(`Memory ${memory.id} blocked: workspace mismatch.`);
      continue;
    }

    if (memory.status === 'deleted' || memory.status === 'blocked') {
      pushUnique(blockedMemoryIds, memory.id);
      reasons.push(`Memory ${memory.id} blocked: status is ${memory.status}.`);
      continue;
    }

    if (memory.status === 'redacted') {
      pushUnique(blockedMemoryIds, memory.id);
      reasons.push(`Memory ${memory.id} blocked: memory is redacted.`);
      continue;
    }

    if (memory.containsSecret && !hasPermission(input.actorPermissions, 'memory:read_secret')) {
      pushUnique(blockedMemoryIds, memory.id);
      reasons.push(`Memory ${memory.id} blocked: contains secret.`);
      continue;
    }

    if (memory.containsPii && !hasPermission(input.actorPermissions, 'memory:read_pii')) {
      pushUnique(reviewMemoryIds, memory.id);
      reasons.push(`Memory ${memory.id} requires review: contains PII.`);
      continue;
    }

    if (memory.status === 'conflicted' && !input.scope.includeConflicted) {
      pushUnique(reviewMemoryIds, memory.id);
      reasons.push(`Memory ${memory.id} requires review: conflicted memory.`);
      continue;
    }

    if (memory.status === 'stale' && !input.scope.includeStale) {
      pushUnique(reviewMemoryIds, memory.id);
      reasons.push(`Memory ${memory.id} requires review: stale memory.`);
      continue;
    }

    if (
      memory.containsProductionClaim &&
      input.scope.requireVerifiedEvidence &&
      memory.trustLevel !== 'verified'
    ) {
      pushUnique(blockedMemoryIds, memory.id);
      reasons.push(
        `Memory ${memory.id} blocked: production claim is not verified by evidence.`,
      );
      continue;
    }

    if (
      input.scope.purpose === 'runtime_execution' &&
      memory.trustLevel === 'unverified'
    ) {
      pushUnique(reviewMemoryIds, memory.id);
      reasons.push(
        `Memory ${memory.id} requires review: unverified memory cannot directly support runtime execution.`,
      );
      continue;
    }

    if (
      input.scope.purpose === 'completion_report' &&
      memory.trustLevel !== 'verified' &&
      input.scope.requireVerifiedEvidence
    ) {
      pushUnique(blockedMemoryIds, memory.id);
      reasons.push(
        `Memory ${memory.id} blocked: completion report requires verified evidence-backed memory.`,
      );
      continue;
    }

    pushUnique(allowedMemoryIds, memory.id);
  }

  if (blockedMemoryIds.length > 0) {
    return {
      status: 'BLOCK',
      reasons,
      allowedMemoryIds,
      blockedMemoryIds,
      reviewMemoryIds,
    };
  }

  if (reviewMemoryIds.length > 0) {
    return {
      status: 'REVIEW',
      reasons,
      allowedMemoryIds,
      blockedMemoryIds,
      reviewMemoryIds,
    };
  }

  return {
    status: 'PASS',
    reasons,
    allowedMemoryIds,
    blockedMemoryIds,
    reviewMemoryIds,
  };
}

export function assertMemoryCannotOverrideEvidence(input: {
  memory: DsgMemoryEvent;
  hasCurrentEvidence: boolean;
  evidenceStatus?: 'PASS' | 'FAIL' | 'MISSING' | 'CONFLICTED';
}): MemoryGateResult {
  if (!input.hasCurrentEvidence || input.evidenceStatus === 'MISSING') {
    return {
      status: 'BLOCK',
      reasons: [
        `Memory ${input.memory.id} blocked: memory cannot replace missing current evidence.`,
      ],
      allowedMemoryIds: [],
      blockedMemoryIds: [input.memory.id],
      reviewMemoryIds: [],
    };
  }

  if (input.evidenceStatus === 'FAIL' || input.evidenceStatus === 'CONFLICTED') {
    return {
      status: 'BLOCK',
      reasons: [
        `Memory ${input.memory.id} blocked: current evidence status is ${input.evidenceStatus}.`,
      ],
      allowedMemoryIds: [],
      blockedMemoryIds: [input.memory.id],
      reviewMemoryIds: [],
    };
  }

  return {
    status: 'PASS',
    reasons: [],
    allowedMemoryIds: [input.memory.id],
    blockedMemoryIds: [],
    reviewMemoryIds: [],
  };
}
