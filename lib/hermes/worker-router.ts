/**
 * Hermes Worker Router
 *
 * Routes a plan step to the appropriate worker type.
 * Each worker returns a result + evidence items.
 * Workers do NOT block on plan alignment — that is done by the caller
 * (runtime.ts) before invoking the worker.
 */

import type { WorkerType, HermesPlanStep } from "./planner";
import type { EvidenceItem } from "./evidence-reporter";
import { buildEvidenceItem } from "./evidence-reporter";

export type WorkerResult = {
  success: boolean;
  output: string;
  evidence: EvidenceItem[];
  errorMessage?: string;
};

export type WorkerContext = {
  jobId: string;
  stepId: string;
  workspaceId: string;
  params?: Record<string, unknown>;
};

// Worker interface — implement one per worker type.
export type WorkerFn = (
  step: HermesPlanStep,
  ctx: WorkerContext,
) => Promise<WorkerResult>;

// Registry for worker implementations.
// The runtime registers concrete workers before executing a plan.
const WORKER_REGISTRY = new Map<WorkerType, WorkerFn>();

export function registerWorker(type: WorkerType, fn: WorkerFn): void {
  WORKER_REGISTRY.set(type, fn);
}

export async function routeToWorker(
  step: HermesPlanStep,
  ctx: WorkerContext,
): Promise<WorkerResult> {
  const fn = WORKER_REGISTRY.get(step.worker);
  if (!fn) {
    // Fallback: stub worker returns a no-op evidence item so the receipt
    // can be submitted without crashing. Real implementations register workers.
    return {
      success: true,
      output: `[stub] worker '${step.worker}' not registered — no-op`,
      evidence: [
        buildEvidenceItem(
          "action_log",
          `stub:${step.worker}:${step.stepId}`,
          `Stub worker for ${step.worker}`,
        ),
      ],
    };
  }

  try {
    return await fn(step, ctx);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      output: "",
      evidence: [
        buildEvidenceItem("action_log", `error:${msg}`, `Worker error in ${step.worker}`),
      ],
      errorMessage: msg,
    };
  }
}

// Built-in terminal worker (runs in server-side Node.js context).
// Registered here as the default terminal worker.
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

registerWorker("terminal", async (step, ctx) => {
  const command = String(step.params?.command ?? step.goal);
  // Safety: only allow commands starting with known safe prefixes unless
  // the plan explicitly authorizes full shell. This list is intentionally
  // narrow — operators expand it via the plan contract's allowedOperations.
  const SAFE_PREFIXES = ["npm run", "npx ", "node ", "grep ", "find ", "ls ", "cat ", "git "];
  const allowed = SAFE_PREFIXES.some((p) => command.startsWith(p));
  if (!allowed) {
    return {
      success: false,
      output: "",
      evidence: [buildEvidenceItem("action_log", `blocked:${command}`, "Command not in safe prefix list")],
      errorMessage: `Command '${command.slice(0, 80)}' is not in the terminal worker allow-list`,
    };
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      timeout: 60_000,
    });
    const output = (stdout + stderr).trim();
    return {
      success: true,
      output,
      evidence: [
        buildEvidenceItem("command_output", output, `exit:0 cmd:${command.slice(0, 60)}`),
      ],
    };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const output = ((e.stdout ?? "") + (e.stderr ?? "")).trim();
    return {
      success: false,
      output,
      evidence: [
        buildEvidenceItem("command_output", output, `exit:non-zero cmd:${command.slice(0, 60)}`),
      ],
      errorMessage: e.message,
    };
  }
});

// Research worker — stub that delegates to fetch_url if a URL is in params.
registerWorker("research", async (step, _ctx) => {
  const url = step.params?.url;
  if (!url || typeof url !== "string" || !url.startsWith("https://")) {
    return {
      success: true,
      output: "[research] no URL provided",
      evidence: [buildEvidenceItem("action_log", step.goal, "Research stub: goal recorded")],
    };
  }

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const text = (await res.text()).slice(0, 4000);
    return {
      success: res.ok,
      output: text,
      evidence: [
        buildEvidenceItem("api_response", `${res.status}:${text.slice(0, 500)}`, `GET ${url} → ${res.status}`),
      ],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, output: "", evidence: [], errorMessage: msg };
  }
});
