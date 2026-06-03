// Hermes Full Option Runtime — public API barrel

export { buildHermesPlan } from "./planner";
export type { HermesBrainPlan, HermesPlanStep, PlanStepInput, WorkerType } from "./planner";

export { buildActionEvent } from "./action-event";
export type { ActionEventInput } from "./action-event";

export {
  buildEvidenceItem,
  buildResultHash,
  buildEvidenceReceipt,
} from "./evidence-reporter";
export type { EvidenceItem, EvidenceType } from "./evidence-reporter";

export { registerWorker, routeToWorker } from "./worker-router";
export type { WorkerFn, WorkerResult, WorkerContext } from "./worker-router";

export { executeHermesPlan } from "./runtime";
export type { JobResult, StepOutcome, RuntimeOptions } from "./runtime";

export {
  getMemory,
  recordUserPreference,
  recordProjectFact,
  recordWorkflowPattern,
  recordErrorFix,
  findErrorFix,
  upsertSkill,
} from "./memory";
export type {
  HermesMemory,
  UserPreference,
  ProjectFact,
  WorkflowPattern,
  ErrorFixRecord,
  SkillMemoryRecord,
} from "./memory";

export {
  createSkill,
  attachEvidence,
  promoteSkill,
  deprecateSkill,
} from "./skills";
export type { SkillDefinition, SkillStatus, SkillTestResult } from "./skills";

export {
  spawnSubagent,
  logSubagentAction,
  appendSubagentEvidence,
  completeSubagent,
  getSubagent,
  listSubagentsForJob,
} from "./subagents";
export type { SubagentRecord, SubagentRole, SubagentStatus } from "./subagents";
