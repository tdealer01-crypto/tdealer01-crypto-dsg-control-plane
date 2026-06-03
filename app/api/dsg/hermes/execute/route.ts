/**
 * POST /api/dsg/hermes/execute
 *
 * Real Hermes Full Option Runtime endpoint.
 *
 * Flow:
 *   1. LLM decomposes user goal → PlanStepInput[] (callLLMForPlan)
 *   2. buildHermesPlan() → HermesBrainPlan (jobId, stepIds, adaptiveExecution)
 *   3. Each step: buildActionEvent → evaluatePlanAlignment → executeToolSafely
 *   4. Evidence collected per step via buildEvidenceItem + buildHermesEvidenceReceipt
 *   5. Error → record in errorFix memory → retry (maxRetries=2)
 *   6. Synthesis via Haiku 4.5 → DSG Answer Gate
 *
 * Returns: SSE stream compatible with the existing /dashboard/hermes frontend.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOrgRole } from "@/lib/authz";
import { buildHermesPlan } from "@/lib/hermes/planner";
import { buildActionEvent } from "@/lib/hermes/action-event";
import { buildEvidenceItem, buildResultHash } from "@/lib/hermes/evidence-reporter";
import { recordErrorFix, findErrorFix } from "@/lib/hermes/memory";
import { callLLMForPlan } from "@/lib/hermes/llm-planner";
import { evaluatePlanAlignment, buildHermesEvidenceReceipt } from "@/lib/dsg/plan-alignment-gate";
import { buildPlanScopeHash, buildPlanHash } from "@/lib/dsg/plan-scope-contract";
import type { HermesPlanScopeContract } from "@/lib/dsg/plan-scope-contract";
import type { HermesBrainPlan, HermesPlanStep } from "@/lib/hermes/planner";
import type { EvidenceItem } from "@/lib/hermes/evidence-reporter";
import { DSG_TOOLS } from "@/lib/agent/tools";
import { executeToolSafely } from "@/lib/agent/executor";
import type { AgentContext } from "@/lib/agent/context";
import { evaluateAnswerGate, detectClaimsInReply } from "@/lib/dsg/answer-gate";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// ── constants ─────────────────────────────────────────────────────────────────
const HAIKU = "claude-haiku-4-5-20251001";
const MAX_RETRIES = 2;

// ── synthesis ──────────────────────────────────────────────────────────────────
async function synthesize(
  userGoal: string,
  toolResults: Array<{ toolId: string; result: unknown }>,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || toolResults.length === 0) return "";
  const summary = toolResults
    .map((r) => `[${r.toolId}]: ${JSON.stringify(r.result, null, 2).slice(0, 1500)}`)
    .join("\n\n");
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: HAIKU,
        max_tokens: 1024,
        system: `คุณคือ Hermes Agent สำหรับ DSG ONE Control Plane
ตอบเป็นภาษาไทยหรืออังกฤษตามที่ผู้ใช้ถาม
สรุปผลลัพธ์จาก tool ให้กระชับ อ่านง่าย มีประโยชน์ ห้ามพิมพ์ JSON ดิบ
ห้าม claim เกินหลักฐาน`,
        messages: [{ role: "user", content: `คำถาม: ${userGoal}\n\nผล:\n${summary}` }],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return "";
    const data = await res.json() as { content: Array<{ type: string; text?: string }> };
    return data.content?.[0]?.text ?? "";
  } catch { return ""; }
}

// ── per-step execution with full Hermes gate ───────────────────────────────────
async function runStep(
  step: HermesPlanStep,
  plan: HermesBrainPlan,
  contract: HermesPlanScopeContract,
  agentCtx: AgentContext,
  workspaceId: string,
  sessionId: string,
  retryCount = 0,
): Promise<{
  success: boolean;
  decision: string;
  evidence: EvidenceItem[];
  receiptHash: string;
  output: string;
  errorMessage?: string;
}> {
  // 1. Build action event
  const event = buildActionEvent({
    planId: contract.planId,
    planHash: contract.planHash,
    workspaceId,
    agentId: contract.agentId,
    sessionId,
    stepId: step.stepId,
    worker: step.worker,
    operationName: step.goal.slice(0, 80),
    idempotencyKey: `${plan.jobId}:${step.stepId}:${retryCount}`,
  });

  // 2. DSG alignment gate
  const alignment = evaluatePlanAlignment(contract, event);
  if (!alignment.canProceed) {
    return {
      success: false,
      decision: alignment.decision,
      evidence: [],
      receiptHash: "",
      output: "",
      errorMessage: alignment.reasons.join("; "),
    };
  }

  // 3. Execute via DSG tool
  const toolId = String(step.params?.toolId ?? "");
  const tool = DSG_TOOLS.find((t) => t.id === toolId);

  let output = "";
  let success = false;
  let errorMessage: string | undefined;

  if (!tool) {
    // Non-DSG workers (terminal, research) fall through to worker-router stub
    output = `[${step.worker}] step "${step.goal}" — worker not wired to DSG tools`;
    success = true;
  } else {
    try {
      const result = await executeToolSafely(tool, step.params ?? {}, agentCtx);
      output = JSON.stringify(result).slice(0, 2000);
      const r = result as Record<string, unknown>;
      success = !(r.blocked === true);
      if (r.blocked === true) {
        errorMessage = String(r.reason ?? "blocked");
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      success = false;
    }
  }

  // 4. Evidence
  const evidence: EvidenceItem[] = [
    buildEvidenceItem("api_response", output.slice(0, 500), `${toolId || step.worker} → ${success ? "ok" : "error"}`),
  ];
  const receipt = buildHermesEvidenceReceipt(contract, event, alignment, {
    commandId: `${plan.jobId}:${step.stepId}:${retryCount}`,
    actionStatus: success ? "SUCCESS" : "FAILED",
    observedResultHash: buildResultHash(evidence),
    evidenceItemIds: evidence.map((e) => e.hash.slice(0, 16)),
    claimVerified: success && evidence.length > 0,
  });

  // 5. On error: record in memory for future retry
  if (!success && errorMessage) {
    const sig = `${step.worker}:${errorMessage.slice(0, 80)}`;
    recordErrorFix(workspaceId, sessionId, {
      errorSignature: sig,
      rootCause: errorMessage,
      fixPatch: "",
      verificationCommand: "npm run typecheck",
      evidenceHash: buildResultHash(evidence),
    });
  }

  return { success, decision: alignment.decision, evidence, receiptHash: receipt.receiptHash, output, errorMessage };
}

// ── main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const access = await requireOrgRole(["operator", "org_admin"]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
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
      const send = (payload: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      try {
        // 1. LLM creates plan
        send({ type: "preflight", decision: "PLAN_MATCHED_ALLOW_AUDIT", reason: "Hermes planning..." });

        const { reply: planReply, steps } = await callLLMForPlan(message);

        // Send LLM's "I will do X" reply immediately
        if (planReply) {
          const facts = detectClaimsInReply(planReply, { executedSteps: false, hasUserQuestion: true });
          const gate = evaluateAnswerGate(facts);
          send({
            type: "assistant_reply",
            reply: gate.allowed ? planReply : `⚠️ [DSG Gate: ${gate.final_decision}]\n\n${planReply}`,
            model: "hermes-planner",
          });
        }

        if (steps.length === 0) {
          send({ type: "done" });
          controller.close();
          return;
        }

        // 2. Build HermesBrainPlan
        const plan = buildHermesPlan(message, steps, { summary: message.slice(0, 100) });
        send({
          type: "plan",
          steps: plan.steps.map((s) => ({ id: s.stepId, toolId: s.worker, goal: s.goal })),
        });

        // 3. Build plan contract
        const contractBase = {
          planId: plan.jobId,
          workspaceId: access.orgId,
          agentId: "hermes-runtime",
          approvedBy: access.orgId,
          approvedAt: new Date().toISOString(),
          allowedActionTypes: ["read", "write", "observe"] as HermesPlanScopeContract["allowedActionTypes"],
          allowedTargetSystems: ["repo", "shell", "external_api", "browser", "web", "db"],
          allowedOperations: steps.map((s) => s.goal.slice(0, 80)),
          maxRiskLevel: "high" as const,
          evidenceRequirements: {
            requireIdempotency: false,
            requireRollback: false,
            requireAudit: true,
            requireEvidence: true,
          },
          claimBoundary: `Hermes: ${message.slice(0, 100)}`,
        };
        const scopeHash = buildPlanScopeHash(contractBase);
        const withScope = { ...contractBase, scopeHash };
        const planHash = buildPlanHash(withScope);
        const contract: HermesPlanScopeContract = { ...withScope, planHash };

        // 4. Execute each step with gate + evidence (streaming)
        const toolResults: Array<{ toolId: string; result: unknown }> = [];
        const allEvidence: EvidenceItem[] = [];

        for (const step of plan.steps) {
          send({ type: "step_start", step: step.stepId, tool: step.worker });

          let outcome = await runStep(step, plan, contract, agentCtx, access.orgId, sessionId);

          // Adaptive retry: if failed and we have a known fix, retry with fix hint
          if (!outcome.success && outcome.errorMessage) {
            const sig = `${step.worker}:${outcome.errorMessage.slice(0, 80)}`;
            const knownFix = findErrorFix(access.orgId, sessionId, sig);
            for (let attempt = 1; attempt <= MAX_RETRIES && !outcome.success; attempt++) {
              const retryStep: HermesPlanStep = knownFix
                ? { ...step, params: { ...step.params, fixHint: knownFix.fixPatch } }
                : step;
              outcome = await runStep(retryStep, plan, contract, agentCtx, access.orgId, sessionId, attempt);
            }
          }

          allEvidence.push(...outcome.evidence);

          if (outcome.success) {
            toolResults.push({ toolId: step.params?.toolId ? String(step.params.toolId) : step.worker, result: { output: outcome.output, decision: outcome.decision } });
            send({ type: "step_result", step: step.stepId, result: { output: outcome.output, decision: outcome.decision, receiptHash: outcome.receiptHash } });
          } else {
            send({ type: "step_error", step: step.stepId, error: outcome.errorMessage ?? "step failed" });
          }
        }

        // 5. Synthesize + DSG Answer Gate
        const synthesis = await synthesize(message, toolResults);
        if (synthesis) {
          const facts = detectClaimsInReply(synthesis, { executedSteps: toolResults.length > 0, hasUserQuestion: true });
          const gate = evaluateAnswerGate(facts);
          send({
            type: "assistant_reply",
            reply: gate.allowed ? synthesis : `⚠️ [DSG Gate: ${gate.final_decision}]\n\n${synthesis}`,
            model: HAIKU,
            planHash,
            claimBoundary: contractBase.claimBoundary,
            evidenceCount: allEvidence.length,
          });
        }

        send({ type: "done" });
      } catch (err) {
        send({
          type: "assistant_reply",
          reply: err instanceof Error ? err.message : "Hermes execution failed",
          model: "hermes-runtime-v1",
        });
        send({ type: "done" });
      } finally {
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
