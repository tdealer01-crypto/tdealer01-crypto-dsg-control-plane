/**
 * POST /api/dsg/hermes/execute
 *
 * Low-latency Hermes chat endpoint for the dashboard.
 *
 * This endpoint is deterministic-first. It executes the selected DSG tools,
 * streams every step result/error, and always emits a final assistant_reply
 * before done. LLM synthesis must not block the chat path long enough to hit
 * the Vercel function timeout.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireOrgRole } from "@/lib/authz";
import { DSG_TOOLS } from "@/lib/agent/tools";
import { executeToolSafely } from "@/lib/agent/executor";
import type { AgentContext, AgentPlanStep } from "@/lib/agent/context";
import { planGoal } from "@/lib/agent/planner";
import { agentPreflight } from "@/lib/agent/preflight";
import { evaluateAnswerGate, detectClaimsInReply } from "@/lib/dsg/answer-gate";
import { loadStartupContext } from "@/lib/hermes/startup-context";
import { evaluateHermesGovernance, formatGovernanceDecision } from "@/lib/hermes/ai-firstify-gate";

export const dynamic = "force-dynamic";

const TOOL_TIMEOUT_MS = 3_500;
const HARD_STEP_BUDGET_MS = 7_000;

type StepOutcome = {
  id: string;
  toolId: string;
  ok: boolean;
  result?: unknown;
  error?: string;
};

function raceTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`tool timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (error) => {
        clearTimeout(id);
        reject(error);
      },
    );
  });
}

function safeStringify(value: unknown, limit = 1_200): string {
  if (typeof value === "string") return value.slice(0, limit);
  if (value === null || value === undefined) return "-";
  try {
    return JSON.stringify(value, null, 2).slice(0, limit);
  } catch {
    return String(value).slice(0, limit);
  }
}

function classifyAction(message: string) {
  if (/deploy|push|release|ship/i.test(message)) return "deploy";
  if (/edit|fix|change|refactor|update|add.*file|create.*file/i.test(message)) return "edit_code";
  if (/test|typecheck|lint|verify/i.test(message)) return "run_test";
  return "answer";
}

function humanStepName(toolId: string): string {
  const labels: Record<string, string> = {
    readiness: "ตรวจสถานะระบบ",
    list_agents: "อ่านรายการ agents",
    list_policies: "อ่าน policies",
    list_executions: "อ่าน execution history",
    get_audit: "อ่าน audit log",
    get_usage: "อ่าน usage",
    capacity: "อ่าน capacity",
    get_metrics: "อ่าน metrics",
    list_proofs: "อ่าน proof artifacts",
    get_compliance_status: "อ่าน compliance status",
    get_delivery_proof: "อ่าน delivery proof",
    fetch_url: "ดึงข้อมูล URL",
    browser_navigate: "เปิด browser task",
    run_code: "รัน code",
    write_code_file: "เขียนไฟล์",
  };
  return labels[toolId] ?? toolId;
}

function summarize(message: string, outcomes: StepOutcome[]): string {
  const ok = outcomes.filter((item) => item.ok);
  const failed = outcomes.filter((item) => !item.ok);
  const lines: string[] = [];

  lines.push("Hermes ตอบได้แล้ว — ผมรันผ่าน DSG gate และ tool trace ให้แล้ว");
  lines.push("");
  lines.push(`สรุป: สำเร็จ ${ok.length}/${outcomes.length} steps${failed.length ? `, มีปัญหา ${failed.length} step` : ""}`);

  for (const item of outcomes.slice(0, 5)) {
    const name = humanStepName(item.toolId);
    if (item.ok) {
      lines.push(`- ${name}: สำเร็จ`);
      const preview = safeStringify(item.result, 280);
      if (preview && preview !== "-") lines.push(`  ${preview.replace(/\n/g, " ").slice(0, 280)}`);
    } else {
      lines.push(`- ${name}: ไม่สำเร็จ — ${item.error ?? "unknown error"}`);
    }
  }

  if (failed.length > 0) {
    lines.push("");
    lines.push("หมายเหตุ: step ที่ล้มเหลวถูก mark เป็น error แล้ว ไม่ปล่อยค้างเป็น running");
  }

  if (/agent|เอเจ้น/i.test(message) && ok.length === 0) {
    lines.push("");
    lines.push("ลองถามแบบ: 'list agents' หรือ 'system status' เพื่อเช็ก tool พื้นฐานก่อน");
  }

  return lines.join("\n");
}

async function executeStep(step: AgentPlanStep, context: AgentContext): Promise<StepOutcome> {
  const tool = DSG_TOOLS.find((candidate) => candidate.id === step.toolId);
  if (!tool) {
    return {
      id: step.id,
      toolId: step.toolId,
      ok: false,
      error: `tool not found: ${step.toolId}`,
    };
  }

  try {
    const result = await raceTimeout(executeToolSafely(tool, step.params ?? {}, context), TOOL_TIMEOUT_MS);
    const record = result as Record<string, unknown>;
    const blocked = record?.blocked === true;
    return {
      id: step.id,
      toolId: step.toolId,
      ok: !blocked,
      result,
      error: blocked ? String(record.reason ?? "blocked by gate") : undefined,
    };
  } catch (error) {
    return {
      id: step.id,
      toolId: step.toolId,
      ok: false,
      error: error instanceof Error ? error.name : 'step_execution_failed',
    };
  }
}

function finalDecision(outcomes: StepOutcome[]) {
  if (outcomes.length === 0) return "REVIEW";
  return outcomes.every((item) => item.ok) ? "ALLOW" : "REVIEW";
}

export async function POST(req: NextRequest) {
  const access = await requireOrgRole(["operator", "org_admin"]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const message = String(body.message ?? "").trim();
  const sessionId = String(body.sessionId ?? randomUUID());
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

  const agentCtx: AgentContext = {
    orgId: access.orgId,
    role: access.grantedRoles.includes("org_admin") ? "org_admin" : "operator",
    origin: new URL(req.url).origin,
    authHeader: req.headers.get("authorization") ?? "",
    cookieHeader: req.headers.get("cookie") ?? "",
    approvalToken: typeof body.approvalToken === "string" ? body.approvalToken : undefined,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (payload: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        const startup = loadStartupContext();
        send({
          type: "startup_context",
          files: startup.files,
          loadedAt: startup.loadedAt,
          note: startup.files.length > 0
            ? `Hermes อ่าน ${startup.files.join(" + ")} แล้ว`
            : "startup context not available",
        });

        const preflight = await agentPreflight({
          userGoal: message,
          requestedAction: classifyAction(message),
          repoContext: [],
          orgPlan: undefined,
          actorRole: agentCtx.role,
        });

        if (preflight.decision === "block") {
          send({ type: "preflight", decision: "BLOCK", reason: preflight.reason, risk: "HIGH" });
          send({ type: "assistant_reply", reply: `Blocked: ${preflight.reason}`, model: "hermes-preflight" });
          send({ type: "done" });
          return;
        }

        const action = classifyAction(message);
        const governance = await evaluateHermesGovernance(agentCtx.orgId, action, {
          message,
          riskLevel: preflight.decision === "review" ? "medium" : "low",
          environment: "hermes_execution",
        });

        if (governance.decision === "BLOCK") {
          send({ type: "governance", decision: "BLOCK", reason: governance.reason, policyIds: governance.policyIds });
          send({ type: "assistant_reply", reply: `AI-Firstify Governance: ${formatGovernanceDecision(governance)}`, model: "hermes-governance" });
          send({ type: "done" });
          return;
        }

        const preflightDecision = preflight.decision === "review" ? "REVIEW" : "ALLOW";
        const governanceDecision = governance.decision;
        const finalGovernanceDecision = preflightDecision === "REVIEW" || governanceDecision === "REVIEW" ? "REVIEW" : "ALLOW";

        send({ type: "session.status_running" });
        send({
          type: "preflight",
          decision: preflightDecision,
          reason: preflight.reason ?? "Hermes deterministic plan allowed",
          risk: preflight.decision === "review" ? "MEDIUM" : "LOW",
        });

        if (governance.decision === "REVIEW") {
          send({
            type: "governance",
            decision: "REVIEW",
            reason: governance.reason,
            policyIds: governance.policyIds,
            requiresApproval: governance.requiresApproval,
          });
        }

        send({
          type: "assistant_reply",
          reply: "รับคำสั่งแล้ว — Hermes กำลังรัน tool ผ่าน DSG gate ให้ครับ",
          model: "hermes-deterministic-runtime",
        });

        const plan = planGoal(message, "hermes");
        const steps = plan.steps.slice(0, 4);
        send({
          type: "plan",
          steps: steps.map((step) => ({ id: step.id, toolId: step.toolId, goal: step.toolId })),
        });

        const deadline = Date.now() + HARD_STEP_BUDGET_MS;
        const outcomes: StepOutcome[] = [];

        for (const step of steps) {
          if (Date.now() > deadline) {
            const error = "deadline exceeded before step execution";
            outcomes.push({ id: step.id, toolId: step.toolId, ok: false, error });
            send({ type: "step_error", step: step.id, error });
            continue;
          }

          send({ type: "step_start", step: step.id, tool: step.toolId });
          const outcome = await executeStep(step, agentCtx);
          outcomes.push(outcome);

          if (outcome.ok) {
            send({ type: "step_result", step: step.id, result: outcome.result });
          } else {
            send({ type: "step_error", step: step.id, error: outcome.error ?? "step failed" });
          }
        }

        const finalReply = summarize(message, outcomes);
        const facts = detectClaimsInReply(finalReply, {
          executedSteps: outcomes.some((item) => item.ok),
          hasUserQuestion: true,
        });
        const gate = evaluateAnswerGate(facts);

        send({
          type: "assistant_reply",
          reply: gate.allowed ? finalReply : `DSG Answer Gate: ${gate.final_decision}\n\n${finalReply}`,
          model: "hermes-deterministic-summary",
          decision: finalDecision(outcomes),
          evidenceCount: outcomes.length,
        });
        send({ type: "done" });
      } catch (error) {
        const message = error instanceof Error ? error.name : "Hermes execution failed";
        send({ type: "assistant_reply", reply: `Hermes error: ${message}`, model: "hermes-error", decision: "REVIEW" });
        send({ type: "done" });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
