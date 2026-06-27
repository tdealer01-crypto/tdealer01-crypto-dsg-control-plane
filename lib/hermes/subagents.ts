/**
 * Hermes Subagent Pool
 *
 * Each subagent carries its parentPlanHash, stepId, and agentId so that
 * DSG can verify subagent actions are still within the parent plan scope.
 *
 * DSG does not micromanage subagents — it only checks they remain
 * within the parent plan's approved scope.
 */

import { randomUUID } from "crypto";

export type SubagentRole =
  | "InspectorAgent"
  | "PatchAgent"
  | "TestAgent"
  | "BrowserAgent"
  | "DBMigrationAgent"
  | "DeployAgent"
  | "EvidenceAgent"
  | "ReviewerAgent";

export type SubagentStatus = "spawned" | "running" | "done" | "failed";

export type SubagentRecord = {
  subagentId: string;
  role: SubagentRole;
  parentPlanHash: string;
  parentJobId: string;
  stepId: string;
  agentId: string;
  status: SubagentStatus;
  actionLog: string[];
  evidenceOutput: string[];
  spawnedAt: string;
  completedAt?: string;
};

// In-process pool — replace with Supabase-backed store for production.
const pool = new Map<string, SubagentRecord>();

export function spawnSubagent(opts: {
  role: SubagentRole;
  parentPlanHash: string;
  parentJobId: string;
  stepId: string;
  agentId: string;
}): SubagentRecord {
  const subagentId = `sub-${randomUUID().slice(0, 12)}`;
  const record: SubagentRecord = {
    subagentId,
    role: opts.role,
    parentPlanHash: opts.parentPlanHash,
    parentJobId: opts.parentJobId,
    stepId: opts.stepId,
    agentId: opts.agentId,
    status: "spawned",
    actionLog: [],
    evidenceOutput: [],
    spawnedAt: new Date().toISOString(),
  };
  pool.set(subagentId, record);
  return record;
}

export function logSubagentAction(subagentId: string, action: string): void {
  pool.get(subagentId)?.actionLog.push(`${new Date().toISOString()}: ${action}`);
}

export function appendSubagentEvidence(subagentId: string, evidenceHash: string): void {
  pool.get(subagentId)?.evidenceOutput.push(evidenceHash);
}

export function completeSubagent(
  subagentId: string,
  status: "done" | "failed",
): SubagentRecord | undefined {
  const rec = pool.get(subagentId);
  if (!rec) return undefined;
  rec.status = status;
  rec.completedAt = new Date().toISOString();
  return rec;
}

export function getSubagent(subagentId: string): SubagentRecord | undefined {
  return pool.get(subagentId);
}

export function listSubagentsForJob(parentJobId: string): SubagentRecord[] {
  return [...pool.values()].filter((r) => r.parentJobId === parentJobId);
}
