/**
 * Hermes Skill System
 *
 * Skill lifecycle: DRAFT → TESTED → EVIDENCE_ATTACHED → APPROVED_FOR_REUSE
 *                                                      → DEPRECATED / ROLLBACK
 *
 * DSG does not block skill creation.
 * DSG audits: which job created the skill, which plan it was built under,
 * what evidence it has, and tracks reuse.
 */

import { createHash, randomUUID } from "crypto";
import { upsertSkill, type SkillMemoryRecord } from "./memory";

export type SkillStatus = SkillMemoryRecord["status"];

export type SkillDefinition = {
  skillId: string;
  skillName: string;
  version: string;
  whenToUse: string;
  requiredInputs: string[];
  commands: string[];
  expectedEvidence: string[];
  knownFailures: string[];
  parentPlanHash: string;
  createdByJobId: string;
};

export type SkillTestResult = {
  skillId: string;
  passed: boolean;
  evidenceHash: string;
  notes: string;
};

function evidenceHash(evidence: string[]): string {
  return createHash("sha256")
    .update(JSON.stringify(evidence))
    .digest("hex")
    .slice(0, 32);
}

export function createSkill(
  workspaceId: string,
  sessionId: string,
  input: Omit<SkillDefinition, "skillId">,
): SkillDefinition {
  const skillId = `skill-${randomUUID().slice(0, 12)}`;
  const skill: SkillDefinition = { ...input, skillId };

  upsertSkill(workspaceId, sessionId, {
    skillId,
    skillName: input.skillName,
    version: input.version,
    whenToUse: input.whenToUse,
    requiredInputs: input.requiredInputs,
    commands: input.commands,
    expectedEvidence: input.expectedEvidence,
    knownFailures: input.knownFailures,
    evidenceHash: evidenceHash([]),
    status: "draft",
  });

  return skill;
}

export function attachEvidence(
  workspaceId: string,
  sessionId: string,
  skillId: string,
  evidenceItems: string[],
): SkillStatus {
  const hash = evidenceHash(evidenceItems);
  upsertSkill(workspaceId, sessionId, {
    skillId,
    skillName: "",
    version: "",
    whenToUse: "",
    requiredInputs: [],
    commands: [],
    expectedEvidence: [],
    knownFailures: [],
    evidenceHash: hash,
    status: "evidence_attached",
  });
  return "evidence_attached";
}

export function promoteSkill(
  workspaceId: string,
  sessionId: string,
  skillId: string,
  testResult: SkillTestResult,
): SkillStatus {
  const nextStatus: SkillStatus = testResult.passed ? "approved_for_reuse" : "draft";
  upsertSkill(workspaceId, sessionId, {
    skillId,
    skillName: "",
    version: "",
    whenToUse: "",
    requiredInputs: [],
    commands: [],
    expectedEvidence: [],
    knownFailures: testResult.notes ? [testResult.notes] : [],
    evidenceHash: testResult.evidenceHash,
    status: nextStatus,
  });
  return nextStatus;
}

export function deprecateSkill(
  workspaceId: string,
  sessionId: string,
  skillId: string,
  reason: string,
): void {
  upsertSkill(workspaceId, sessionId, {
    skillId,
    skillName: "",
    version: "",
    whenToUse: "",
    requiredInputs: [],
    commands: [],
    expectedEvidence: [],
    knownFailures: [reason],
    evidenceHash: "",
    status: "deprecated",
  });
}
