/**
 * GET /api/dsg/hermes/status
 *
 * Returns the current status of the Hermes Full Option Runtime:
 *   - DSG Plan Gate readiness
 *   - Worker registry status
 *   - Memory layer status
 *   - Subagent pool summary
 *   - Architecture version
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ARCHITECTURE_VERSION = "hermes-full-option-v1";

const WORKER_TYPES = [
  "file",
  "terminal",
  "browser",
  "api",
  "db",
  "deploy",
  "skill",
  "subagent",
  "research",
] as const;

const DECISION_MODEL = {
  PLAN_MATCHED_ALLOW_AUDIT: "Action in plan → execute + audit",
  PLAN_RELATED_REPLAN:      "Related but not in plan → replan first",
  OUT_OF_PLAN_DENY:         "Not in user plan → deny",
  CLAIM_EVIDENCE_DENY:      "Action ok but claim exceeds evidence → deny claim only",
} as const;

export async function GET() {
  return NextResponse.json({
    ok: true,
    runtime: ARCHITECTURE_VERSION,
    philosophy: {
      hermes: "Hermes ทำงานเต็มกำลัง",
      dsg: "DSG พิสูจน์ว่างานทำตามแผนผู้ใช้",
      executor: "Executor แตะระบบจริง",
      evidence: "Evidence เป็นตัวตัดสินว่าพูดได้แค่ไหน",
    },
    modules: {
      planner:          "lib/hermes/planner.ts",
      workerRouter:     "lib/hermes/worker-router.ts",
      actionEvent:      "lib/hermes/action-event.ts",
      evidenceReporter: "lib/hermes/evidence-reporter.ts",
      runtime:          "lib/hermes/runtime.ts",
      memory:           "lib/hermes/memory.ts",
      skills:           "lib/hermes/skills.ts",
      subagents:        "lib/hermes/subagents.ts",
    },
    workers: WORKER_TYPES,
    dsgGate: {
      planEndpoint:     "/api/dsg/hermes/plan",
      actionEndpoint:   "/api/dsg/hermes/action",
      evidenceEndpoint: "/api/dsg/hermes/evidence",
      decisionModel:    DECISION_MODEL,
    },
    memory: {
      layers: [
        "User Memory — preferences & constraints",
        "Project Memory — stack, routes, scripts",
        "Workflow Memory — successful patterns",
        "Error/Fix Memory — error signatures + fixes",
        "Skill Memory — reusable skill records",
      ],
      claimRule: "Memory is context, not truth. Truth = evidence from repo/test/build/deploy",
    },
    skillLifecycle: ["draft", "tested", "evidence_attached", "approved_for_reuse", "deprecated", "rollback"],
    adaptiveExecution: {
      allowMethodChanges: true,
      allowFixAfterError: true,
      allowAdditionalStepsIfGoalAligned: true,
      requireReplanWhenOutsidePlan: true,
    },
    status: "ready",
  });
}
