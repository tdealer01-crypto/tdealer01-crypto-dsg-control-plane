import { createHash } from 'node:crypto';

import type {
  DsgMemoryEvent,
  MemoryContextPack,
  MemoryRetrievalScope,
} from './types';
import { evaluateMemoryGate } from './memory-gate';

export type BuildMemoryContextPackInput = {
  id: string;
  memories: DsgMemoryEvent[];
  scope: MemoryRetrievalScope;
  actorPermissions: string[];
  evidenceIds?: string[];
  auditIds?: string[];
  createdAt: string;
};

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }

  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableJson(nestedValue)}`)
    .join(',')}}`;
}

export function hashMemoryContext(input: {
  scope: MemoryRetrievalScope;
  memoryIds: string[];
  contextText: string;
  evidenceIds: string[];
  auditIds: string[];
}): string {
  return createHash('sha256')
    .update(stableJson(input))
    .digest('hex');
}

export function buildMemoryContextText(memories: DsgMemoryEvent[]): string {
  return memories
    .slice()
    .sort((left, right) => {
      const createdComparison = left.createdAt.localeCompare(right.createdAt);
      if (createdComparison !== 0) return createdComparison;
      return left.id.localeCompare(right.id);
    })
    .map((memory, index) => {
      const body = memory.normalizedSummary?.trim() || memory.rawText.trim();
      return [
        `Memory ${index + 1}`,
        `id: ${memory.id}`,
        `kind: ${memory.memoryKind}`,
        `trust: ${memory.trustLevel}`,
        `status: ${memory.status}`,
        `createdAt: ${memory.createdAt}`,
        `content: ${body}`,
      ].join('\n');
    })
    .join('\n\n---\n\n');
}

export function buildMemoryContextPack(
  input: BuildMemoryContextPackInput,
): MemoryContextPack {
  const gate = evaluateMemoryGate({
    memories: input.memories,
    scope: input.scope,
    actorPermissions: input.actorPermissions,
  });

  const allowedMemoryIds = new Set(gate.allowedMemoryIds);
  const allowedMemories = input.memories.filter((memory) => allowedMemoryIds.has(memory.id));
  const evidenceIds = input.evidenceIds ?? [];
  const auditIds = input.auditIds ?? [];
  const contextText = buildMemoryContextText(allowedMemories);
  const memoryIds = allowedMemories.map((memory) => memory.id).sort();

  return {
    id: input.id,
    workspaceId: input.scope.workspaceId,
    jobId: input.scope.jobId,
    actorId: input.scope.actorId,
    purpose: input.scope.purpose,
    memoryIds,
    contextText,
    contextHash: hashMemoryContext({
      scope: input.scope,
      memoryIds,
      contextText,
      evidenceIds,
      auditIds,
    }),
    gateStatus: gate.status,
    gateReasons: gate.reasons,
    evidenceIds,
    auditIds,
    createdAt: input.createdAt,
  };
}
