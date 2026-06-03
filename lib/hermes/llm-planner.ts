/**
 * Hermes LLM Planner
 *
 * Calls LLM to decompose a user goal into PlanStepInput[].
 * Uses OpenRouter with JSON mode — same infrastructure as llm-router.ts.
 */

import type { PlanStepInput, WorkerType } from "./planner";

const PLANNER_SYSTEM = `You are the Hermes Brain Planner for DSG ONE Control Plane.
Your job: convert a user goal into a structured execution plan.

Available workers + toolIds:

READ (safe, no approval):
  worker="api"  toolId: readiness | list_agents | list_executions | get_audit | get_usage
               capacity | list_policies | get_metrics | get_enterprise_proof
               get_compliance_status | get_delivery_proof | get_ledger | list_proofs
               get_integration | get_agent_detail | audit_summary | realtime_web_search
               fetch_url | browser_navigate | get_execution_proof

WRITE:
  worker="api"  toolId: create_agent        params: { name, monthly_limit? }
                         create_chatbot_agent params: { name?, monthly_limit? }
                         update_agent         params: { agent_id, name?, status?, monthly_limit? }
                         rotate_agent_key     params: { agent_id }
                         delete_agent         params: { agent_id }
                         execute_action       params: { agent_id, action, payload? }
                         checkpoint           params: { agent_id }
                         recovery_validate    params: { agent_id }
                         reconcile_effect     params: { effect_id, status }
                         auto_setup
                         write_code_file      params: { filename, content, language? }
                         run_code             params: { runtime:"node"|"python3"|"bash", code }
                         telegram_send        params: { agent_id, chat_id, text }

TERMINAL (safe commands only):
  worker="terminal"  params.command: "npm run typecheck" | "npm run test" | "git status" | "ls"

RESEARCH (URL fetch):
  worker="research"  params.url: "https://..."

Output JSON ONLY — no markdown:
{
  "reply": "what I will do (match user language: Thai or English)",
  "steps": [
    { "goal": "step description", "worker": "api", "params": { "toolId": "readiness" } }
  ]
}

Rules:
- max 5 steps
- If question needs no action → steps: []
- Every "api" step MUST have params.toolId
- Match user language in reply`;

type RawStep = {
  goal?: unknown;
  worker?: unknown;
  params?: unknown;
  expectedEvidence?: unknown;
};

const VALID_WORKERS: WorkerType[] = [
  "file", "terminal", "browser", "api", "db", "deploy", "skill", "subagent", "research",
];

function toWorkerType(w: unknown): WorkerType {
  const s = String(w ?? "api");
  return VALID_WORKERS.includes(s as WorkerType) ? (s as WorkerType) : "api";
}

export async function callLLMForPlan(
  userGoal: string,
): Promise<{ reply: string; steps: PlanStepInput[] }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { reply: "", steps: [] };
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL ?? "https://tdealer01-crypto-dsg-control-plane.vercel.app",
        "X-Title": "DSG Hermes Planner",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4-5",
        messages: [
          { role: "system", content: PLANNER_SYSTEM },
          { role: "user", content: userGoal },
        ],
        max_tokens: 1024,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) return { reply: "", steps: [] };

    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "{}";

    const parsed = JSON.parse(content) as { reply?: unknown; steps?: unknown[] };

    const steps: PlanStepInput[] = ((parsed.steps ?? []) as RawStep[]).map((s) => ({
      goal: String(s.goal ?? ""),
      worker: toWorkerType(s.worker),
      params: (s.params && typeof s.params === "object") ? (s.params as Record<string, unknown>) : {},
      expectedEvidence: Array.isArray(s.expectedEvidence)
        ? (s.expectedEvidence as unknown[]).map(String)
        : undefined,
    }));

    return { reply: String(parsed.reply ?? ""), steps };
  } catch {
    return { reply: "", steps: [] };
  }
}
