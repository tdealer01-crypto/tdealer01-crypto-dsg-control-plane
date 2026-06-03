/**
 * Hermes Action Event Factory
 *
 * Builds HermesActionEvent instances from plan steps before submitting
 * to the DSG Plan Alignment Gate.
 */

import { randomUUID } from "crypto";
import type { HermesActionEvent } from "@/lib/dsg/plan-scope-contract";
import type { AgentActionType } from "@/lib/dsg/agent-command-gate";
import type { RiskLevel } from "@/lib/dsg/midmarket-governance-autopilot";
import type { WorkerType } from "./planner";

export type ActionEventInput = {
  planId: string;
  planHash: string;
  workspaceId: string;
  agentId: string;
  sessionId: string;
  stepId: string;
  worker: WorkerType;
  operationName: string;
  targetSystemId?: string;
  payloadHash?: string;
  idempotencyKey?: string;
  rollbackPlanId?: string;
  evidenceManifestId?: string;
  policySnapshotHash?: string;
  preAuditEventId?: string;
  ledgerId?: string;
  chainHeadHash?: string;
  claimedOutcome?: string;
};

const WORKER_ACTION_TYPE: Record<WorkerType, AgentActionType> = {
  file:     "write",
  terminal: "write",
  browser:  "read",
  api:      "write",
  db:       "write",
  deploy:   "deploy",
  skill:    "write",
  subagent: "write",
  research: "read",
};

const WORKER_RISK: Record<WorkerType, RiskLevel> = {
  file:     "low",
  terminal: "medium",
  browser:  "low",
  api:      "medium",
  db:       "high",
  deploy:   "high",
  skill:    "low",
  subagent: "medium",
  research: "low",
};

const WORKER_TARGET: Record<WorkerType, string> = {
  file:     "repo",
  terminal: "shell",
  browser:  "browser",
  api:      "external_api",
  db:       "database",
  deploy:   "deployment",
  skill:    "skill_registry",
  subagent: "subagent_pool",
  research: "web",
};

export function buildActionEvent(input: ActionEventInput): HermesActionEvent {
  return {
    eventId: randomUUID(),
    planId: input.planId,
    planHash: input.planHash,
    workspaceId: input.workspaceId,
    agentId: input.agentId,
    sessionId: input.sessionId,
    actionType: WORKER_ACTION_TYPE[input.worker],
    targetSystemId: input.targetSystemId ?? WORKER_TARGET[input.worker],
    operationName: input.operationName,
    riskLevel: WORKER_RISK[input.worker],
    payloadHash: input.payloadHash,
    idempotencyKey: input.idempotencyKey,
    rollbackPlanId: input.rollbackPlanId,
    evidenceManifestId: input.evidenceManifestId,
    policySnapshotHash: input.policySnapshotHash,
    preAuditEventId: input.preAuditEventId,
    ledgerId: input.ledgerId,
    chainHeadHash: input.chainHeadHash,
    claimedOutcome: input.claimedOutcome,
    requestedAt: new Date().toISOString(),
  };
}
