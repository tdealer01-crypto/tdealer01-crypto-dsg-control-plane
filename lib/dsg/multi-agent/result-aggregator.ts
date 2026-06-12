import type { AgentExecutionResult, BatchExecutionResult } from './types';
import { sha256Json } from '@/lib/dsg/hermes-e2e/hash';

export interface EvidenceChainLink {
  taskId: string;
  agentId: number;
  status: string;
  decision: string;
  evidenceHash?: string;
  previousHash: string;
}

export function aggregateResults(
  batchId: string,
  taskDagHash: string,
  constraintSetHash: string,
  assignmentHash: string,
  allResults: AgentExecutionResult[],
): BatchExecutionResult {
  const evidenceChain = computeEvidenceChain(allResults);

  const agentEvidenceHashes: Record<number, string> = {};
  evidenceChain.forEach((link, i) => {
    agentEvidenceHashes[link.agentId] = computeLinkHash(evidenceChain[i]);
  });

  const successCount = allResults.filter((r) => r.status === 'SUCCESS').length;
  const failureCount = allResults.filter((r) => r.status === 'FAILED').length;
  const blockCount = allResults.filter((r) => r.status === 'BLOCKED').length;

  const status: BatchExecutionResult['status'] =
    failureCount > 0 ? 'FAILED' : blockCount > 0 ? 'PARTIAL_FAILURE' : 'COMPLETED';

  const masterEvidenceHash = computeMasterHash(
    batchId,
    taskDagHash,
    constraintSetHash,
    assignmentHash,
    evidenceChain,
  );

  return {
    batchId,
    status,
    taskDagHash,
    constraintSetHash,
    assignmentHash,
    assignments: [],
    results: allResults,
    totalExecutionTimeMs: allResults.reduce((sum, r) => sum + r.executionTimeMs, 0),
    agentEvidenceHashes,
    masterEvidenceHash,
  };
}

export function computeEvidenceChain(results: AgentExecutionResult[]): EvidenceChainLink[] {
  const chain: EvidenceChainLink[] = [];
  let previousHash = '';

  for (const result of results) {
    const link: EvidenceChainLink = {
      taskId: result.taskId,
      agentId: result.agentId,
      status: result.status,
      decision: result.decision,
      evidenceHash: result.evidenceHash,
      previousHash,
    };
    previousHash = computeLinkHash(link);
    chain.push(link);
  }

  return chain;
}

export function computeLinkHash(link: EvidenceChainLink): string {
  return sha256Json({
    taskId: link.taskId,
    agentId: link.agentId,
    status: link.status,
    decision: link.decision,
    evidenceHash: link.evidenceHash ?? null,
    previousHash: link.previousHash,
  });
}

export function computeMasterHash(
  batchId: string,
  taskDagHash: string,
  constraintSetHash: string,
  assignmentHash: string,
  evidenceChain: EvidenceChainLink[],
): string {
  const finalLink = evidenceChain[evidenceChain.length - 1];

  return sha256Json({
    batchId,
    taskDagHash,
    constraintSetHash,
    assignmentHash,
    evidenceChainLength: evidenceChain.length,
    finalEvidenceHash: finalLink ? computeLinkHash(finalLink) : '',
    version: 'batch-master-evidence-v1',
  });
}

export function verifyEvidenceChain(chain: EvidenceChainLink[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  let expectedPrevious = '';
  for (let i = 0; i < chain.length; i++) {
    const link = chain[i];
    if (link.previousHash !== expectedPrevious) {
      errors.push(
        `Link ${i} has incorrect previousHash: expected ${expectedPrevious}, got ${link.previousHash}`,
      );
    }
    expectedPrevious = computeLinkHash(link);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
