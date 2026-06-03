/**
 * Hermes 5-Layer Memory System
 *
 * Layers:
 *   1. User Memory     — preferences, constraints, anti-patterns
 *   2. Project Memory  — repo stack, routes, scripts, known limits
 *   3. Workflow Memory — successful execution patterns
 *   4. Error/Fix Memory — error signatures + verified fixes
 *   5. Skill Memory    — reusable skill records with evidence hashes
 *
 * Memory is NOT the source of truth for claims.
 * Truth is always evidence from repo/test/build/deploy.
 */

export type UserPreference = {
  key: string;
  value: string;
  recordedAt: string;
};

export type ProjectFact = {
  key: string;
  value: string;
  source: "inspected_file" | "command_output" | "deploy_log";
  recordedAt: string;
};

export type WorkflowPattern = {
  patternId: string;
  name: string;
  description: string;
  stepSummary: string[];
  evidenceHash: string;
  usedCount: number;
  lastUsedAt: string;
};

export type ErrorFixRecord = {
  errorSignature: string;
  rootCause: string;
  fixPatch: string;
  verificationCommand: string;
  evidenceHash: string;
  resolvedAt: string;
};

export type SkillMemoryRecord = {
  skillId: string;
  skillName: string;
  version: string;
  whenToUse: string;
  requiredInputs: string[];
  commands: string[];
  expectedEvidence: string[];
  knownFailures: string[];
  evidenceHash: string;
  status: "draft" | "tested" | "evidence_attached" | "approved_for_reuse" | "deprecated" | "rollback";
  createdAt: string;
  updatedAt: string;
};

export type HermesMemory = {
  workspaceId: string;
  sessionId: string;
  userMemory: UserPreference[];
  projectMemory: ProjectFact[];
  workflowMemory: WorkflowPattern[];
  errorFixMemory: ErrorFixRecord[];
  skillMemory: SkillMemoryRecord[];
  lastAccessedAt: string;
};

// In-process store — sessions survive serverless warm instances.
// Production deployments should back this with Supabase.
const store = new Map<string, HermesMemory>();

export function getMemory(workspaceId: string, sessionId: string): HermesMemory {
  const key = `${workspaceId}:${sessionId}`;
  if (!store.has(key)) {
    store.set(key, {
      workspaceId,
      sessionId,
      userMemory: [],
      projectMemory: [],
      workflowMemory: [],
      errorFixMemory: [],
      skillMemory: [],
      lastAccessedAt: new Date().toISOString(),
    });
  }
  const mem = store.get(key)!;
  mem.lastAccessedAt = new Date().toISOString();
  return mem;
}

export function recordUserPreference(
  workspaceId: string,
  sessionId: string,
  key: string,
  value: string,
): void {
  const mem = getMemory(workspaceId, sessionId);
  const existing = mem.userMemory.findIndex((p) => p.key === key);
  const entry: UserPreference = { key, value, recordedAt: new Date().toISOString() };
  if (existing >= 0) mem.userMemory[existing] = entry;
  else mem.userMemory.push(entry);
}

export function recordProjectFact(
  workspaceId: string,
  sessionId: string,
  key: string,
  value: string,
  source: ProjectFact["source"] = "inspected_file",
): void {
  const mem = getMemory(workspaceId, sessionId);
  const existing = mem.projectMemory.findIndex((f) => f.key === key);
  const entry: ProjectFact = { key, value, source, recordedAt: new Date().toISOString() };
  if (existing >= 0) mem.projectMemory[existing] = entry;
  else mem.projectMemory.push(entry);
}

export function recordWorkflowPattern(
  workspaceId: string,
  sessionId: string,
  pattern: Omit<WorkflowPattern, "usedCount" | "lastUsedAt">,
): void {
  const mem = getMemory(workspaceId, sessionId);
  const existing = mem.workflowMemory.find((p) => p.patternId === pattern.patternId);
  if (existing) {
    existing.usedCount++;
    existing.lastUsedAt = new Date().toISOString();
  } else {
    mem.workflowMemory.push({ ...pattern, usedCount: 1, lastUsedAt: new Date().toISOString() });
  }
}

export function recordErrorFix(
  workspaceId: string,
  sessionId: string,
  record: Omit<ErrorFixRecord, "resolvedAt">,
): void {
  const mem = getMemory(workspaceId, sessionId);
  mem.errorFixMemory.push({ ...record, resolvedAt: new Date().toISOString() });
}

export function findErrorFix(
  workspaceId: string,
  sessionId: string,
  errorSignature: string,
): ErrorFixRecord | undefined {
  return getMemory(workspaceId, sessionId).errorFixMemory.find(
    (r) => r.errorSignature === errorSignature,
  );
}

export function upsertSkill(
  workspaceId: string,
  sessionId: string,
  skill: Omit<SkillMemoryRecord, "createdAt" | "updatedAt">,
): void {
  const mem = getMemory(workspaceId, sessionId);
  const now = new Date().toISOString();
  const existing = mem.skillMemory.findIndex((s) => s.skillId === skill.skillId);
  if (existing >= 0) {
    mem.skillMemory[existing] = { ...skill, createdAt: mem.skillMemory[existing].createdAt, updatedAt: now };
  } else {
    mem.skillMemory.push({ ...skill, createdAt: now, updatedAt: now });
  }
}
