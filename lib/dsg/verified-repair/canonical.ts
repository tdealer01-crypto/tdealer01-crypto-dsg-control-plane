import { sha256Json } from '@/lib/dsg/runtime/hash';
import type {
  RepairCandidate,
  RepairFinding,
  VerifiedRepairRequest,
} from './types';

export function sortCandidates(candidates: RepairCandidate[]): RepairCandidate[] {
  return [...candidates].sort((a, b) => a.id.localeCompare(b.id));
}
export function canonicalCandidate(candidate: RepairCandidate): Record<string, unknown> {
  return {
    id: candidate.id,
    changeGroup: candidate.changeGroup,
    file: candidate.file,
    expectedHash: sha256Json(candidate.expected),
    replacementHash: sha256Json(candidate.replacement),
    rationale: candidate.rationale,
    score: candidate.score ?? 50,
    conflictsWith: [...(candidate.conflictsWith ?? [])].sort(),
    requires: [...(candidate.requires ?? [])].sort(),
    touchesSensitive: candidate.touchesSensitive === true,
  };
}

export function canonicalFinding(finding: RepairFinding): Record<string, unknown> {
  return {
    id: finding.id,
    summary: finding.summary,
    severity: finding.severity,
    executionRisk: finding.executionRisk,
    affectedFiles: [...finding.affectedFiles].sort(),
    affectedLines: [...(finding.affectedLines ?? [])].sort((a, b) =>
      `${a.file}:${a.start}:${a.end}`.localeCompare(`${b.file}:${b.start}:${b.end}`),
    ),
    evidence: [...finding.evidence]
      .map((item) => ({ ...item }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    reported: finding.reported !== false,
  };
}

export function canonicalRepairRequest(input: VerifiedRepairRequest): Record<string, unknown> {
  return {
    schema: 'dsg.verified-repair.plan-input.v1',
    jobId: input.jobId,
    baseCommit: input.baseCommit ?? null,
    finding: canonicalFinding(input.finding),
    candidates: sortCandidates(input.candidates).map(canonicalCandidate),
    allowedFiles: [...input.allowedFiles].sort(),
    approvals: {
      human: input.approvals?.human === true,
      security: input.approvals?.security === true,
    },
    solver: {
      mode: input.solver?.mode ?? 'pinned',
      seed: input.solver?.seed ?? 0,
    },
  };
}

export function hashRepairRequest(input: VerifiedRepairRequest): string {
  return sha256Json(canonicalRepairRequest(input));
}

export function hashSelectedPlan(
  input: VerifiedRepairRequest,
  selectedCandidateIds: string[],
  quboHash: string,
): string {
  return sha256Json({
    schema: 'dsg.verified-repair.plan.v1',
    requestHash: hashRepairRequest(input),
    selectedCandidateIds: [...selectedCandidateIds].sort(),
    quboHash,
  });
}
