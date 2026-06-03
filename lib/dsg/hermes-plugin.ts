import { createHash } from "crypto";
import type {
  AgentActionEnvelope,
  AgentActionType,
  AgentCommandGateResult,
  AgentCommandGateRequest,
} from "./agent-command-gate";
import { evaluateAgentCommandGate } from "./agent-command-gate";
import type { DataClass, GateDecision, RiskLevel } from "./midmarket-governance-autopilot";

export const HERMES_PLUGIN_VERSION = "dsg-hermes-plugin-v1.0";

export type HermesMode =
  | "local_operator"
  | "gated_executor"
  | "local_proxy"
  | "github_pr_assistant"
  | "evidence_generator"
  | "browser_qa"
  | "x_search_signal";

export interface HermesPluginContext {
  workspaceId: string;
  actorId: string;
  role: "viewer" | "operator" | "approver" | "admin" | "owner";
  permissions: string[];
  customerName?: string;
  approvalRequestId?: string;
  approvalDecision?: "approved" | "rejected" | "pending";
  approvedBy?: string;
  approvedAt?: string;
  /** Approved plan hash — when provided, satisfies audit/evidence/idempotency/rollback requirements */
  planHash?: string;
  proof?: {
    audit?: {
      preAuditEventId: string;
      ledgerId: string;
      chainHeadHash: string;
    };
    evidence?: {
      evidenceManifestId: string;
      policySnapshotHash: string;
      runtimeBindingHash?: string;
    };
  };
}

export interface HermesPluginRequest {
  mode: HermesMode;
  prompt?: string;
  commandText?: string;
  path?: string;
  url?: string;
  query?: string;
  filePaths?: string[];
  prNumber?: number | string;
  payload?: Record<string, unknown>;
  context: HermesPluginContext;
}

export interface HermesPreflightBlock {
  blocked: true;
  rule: string;
  reason: string;
}

export interface HermesPluginEvaluation {
  pluginVersion: string;
  mode: HermesMode;
  canExecute: boolean;
  decision: GateDecision;
  status: "HERMES_EXECUTE" | "HERMES_REVIEW_REQUIRED" | "HERMES_BLOCKED";
  preflightBlock?: HermesPreflightBlock;
  gateResult?: AgentCommandGateResult;
  hermesExecutionPrompt?: string;
  actionEnvelope?: AgentActionEnvelope;
  reasons: string[];
  evaluatedAt: string;
  truthBoundary: string;
}

interface CommandProfile {
  actionType: AgentActionType;
  riskLevel: RiskLevel;
  targetSystemId: string;
  operationName: string;
  dataClasses: DataClass[];
}

// ─── preflight checks ───────────────────────────────────────────────────────

const SENSITIVE_FILE_PATTERNS: RegExp[] = [
  /\.env(?:[^a-zA-Z0-9]|$)/i,
  /\bsecrets?\b/i,
  /\btokens?\b/i,
  /private[_-]?key/i,
  /\.pem(?:[^a-zA-Z0-9]|$)/i,
  /credentials?/i,
  /\.ssh\//i,
  /\bid_rsa\b/,
];

const DANGEROUS_DEPLOY_PATTERNS: RegExp[] = [
  /--prod\b/,
  /deploy:prod\b/,
  /--production\b/,
  /:production\b/,
];

const PUBLIC_PROXY_PATTERNS: RegExp[] = [
  /0\.0\.0\.0/,
  /--public\b/,
  /\bngrok\b/i,
  /--host\s+0\.0\.0\.0/,
];

const AUTO_MERGE_PATTERNS: RegExp[] = [
  /auto[\s_-]?merge/i,
  /\bautomerge\b/i,
  /merge\s+without\s+review/i,
];

const X_TRUTH_CLAIM_PATTERNS: RegExp[] = [
  /x\s+confirms?\b/i,
  /verified\s+by\s+x\b/i,
  /trending\s+proves?\b/i,
  /\btrue\s+fact\s+from\s+x\b/i,
];

function checkSensitiveFileAccess(req: HermesPluginRequest): HermesPreflightBlock | null {
  const text = [req.commandText, req.prompt, ...(req.filePaths ?? [])].filter(Boolean).join(" ");
  const matched = SENSITIVE_FILE_PATTERNS.find((p) => p.test(text));
  if (!matched) return null;
  return {
    blocked: true,
    rule: "NO_SECRET_FILE_ACCESS",
    reason:
      "Hermes may not read, write, or export files matching sensitive patterns (.env, token, secret, private key, credentials, .pem, .ssh). If access is required, use the DSG evidence gate with an approved proof chain.",
  };
}

function checkDangerousDeploy(req: HermesPluginRequest): HermesPreflightBlock | null {
  const text = [req.commandText, req.prompt].filter(Boolean).join(" ");
  const matched = DANGEROUS_DEPLOY_PATTERNS.find((p) => p.test(text));
  if (!matched) return null;
  return {
    blocked: true,
    rule: "NO_PRODUCTION_DEPLOY_WITHOUT_APPROVAL",
    reason:
      "Production deploy commands (--prod, deploy:prod, --production) require an approved approval proof (approvalDecision=approved) and full audit/evidence binding before DSG will issue an action envelope.",
  };
}

function checkPublicProxy(req: HermesPluginRequest): HermesPreflightBlock | null {
  const text = [req.commandText, req.prompt, req.url].filter(Boolean).join(" ");
  const matched = PUBLIC_PROXY_PATTERNS.find((p) => p.test(text));
  if (!matched) return null;
  return {
    blocked: true,
    rule: "NO_PUBLIC_PROXY",
    reason:
      "Hermes proxy must not bind to 0.0.0.0 or expose via a public tunnel (ngrok, --public). Use localhost-only binding for safe local operation.",
  };
}

function checkAutoMerge(req: HermesPluginRequest): HermesPreflightBlock | null {
  const text = [req.commandText, req.prompt].filter(Boolean).join(" ");
  const matched = AUTO_MERGE_PATTERNS.find((p) => p.test(text));
  if (!matched) return null;
  return {
    blocked: true,
    rule: "NO_AUTO_MERGE",
    reason:
      "PR auto-merge is blocked. All pull requests require human review before merge. Hermes may prepare and push the PR but must not trigger the merge action.",
  };
}

function checkXSearchTruthClaim(req: HermesPluginRequest): HermesPreflightBlock | null {
  const text = [req.query, req.prompt].filter(Boolean).join(" ");
  const matched = X_TRUTH_CLAIM_PATTERNS.find((p) => p.test(text));
  if (!matched) return null;
  return {
    blocked: true,
    rule: "NO_X_SEARCH_UNREVIEWED_TRUTH_CLAIM",
    reason:
      "X/Twitter search results must not be treated as verified truth without human review. Rephrase to treat results as signals that require review before acting.",
  };
}

function runPreflightChecks(req: HermesPluginRequest): HermesPreflightBlock | null {
  switch (req.mode) {
    case "local_operator":
      return checkSensitiveFileAccess(req) ?? checkDangerousDeploy(req);
    case "gated_executor":
      return checkSensitiveFileAccess(req) ?? checkDangerousDeploy(req);
    case "local_proxy":
      return checkPublicProxy(req) ?? checkSensitiveFileAccess(req);
    case "github_pr_assistant":
      return checkAutoMerge(req);
    case "evidence_generator":
      return null;
    case "browser_qa":
      return null;
    case "x_search_signal":
      return checkXSearchTruthClaim(req);
  }
}

// ─── command profile per mode ────────────────────────────────────────────────

function buildCommandProfile(req: HermesPluginRequest): CommandProfile {
  switch (req.mode) {
    case "local_operator": {
      const cmd = (req.commandText ?? "").trim();
      const isReadOnly = /^(cat|ls|find|grep|echo|pwd|which|head|tail|wc|diff|stat|file)\b/.test(cmd);
      return {
        actionType: isReadOnly ? "read" : "write",
        riskLevel: isReadOnly ? "low" : "medium",
        targetSystemId: "local-shell",
        operationName: cmd.split(/\s+/)[0] || "shell-command",
        dataClasses: ["internal"],
      };
    }
    case "gated_executor": {
      const cmd = (req.commandText ?? req.prompt ?? "").trim();
      return {
        actionType: "write",
        riskLevel: "medium",
        targetSystemId: "gated-target",
        operationName: cmd.split(/\s+/)[0] || "execute",
        dataClasses: ["internal"],
      };
    }
    case "local_proxy": {
      return {
        actionType: "write",
        riskLevel: "medium",
        targetSystemId: "local-network",
        operationName: "proxy-server-start",
        dataClasses: ["internal"],
      };
    }
    case "github_pr_assistant": {
      const prId = req.prNumber ? String(req.prNumber) : "new";
      return {
        actionType: "write",
        riskLevel: "medium",
        targetSystemId: "github",
        operationName: `pr-${prId}-assist`,
        dataClasses: ["internal"],
      };
    }
    case "evidence_generator": {
      return {
        actionType: "write",
        riskLevel: "low",
        targetSystemId: "dsg-evidence-store",
        operationName: "evidence-generate",
        dataClasses: ["internal"],
      };
    }
    case "browser_qa": {
      const target = (req.path ?? req.url ?? "page").replace(/^\//, "");
      return {
        actionType: "observe",
        riskLevel: "low",
        targetSystemId: "browser",
        operationName: `qa-${target.split("?")[0].slice(0, 40)}`,
        dataClasses: ["public"],
      };
    }
    case "x_search_signal": {
      return {
        actionType: "observe",
        riskLevel: "low",
        targetSystemId: "x-twitter-api",
        operationName: "x-search-signal",
        dataClasses: ["public"],
      };
    }
  }
}

// ─── gate request builder ────────────────────────────────────────────────────

function buildGateRequest(req: HermesPluginRequest, now: Date): AgentCommandGateRequest {
  const payloadHash = req.payload ? sha256(req.payload) : undefined;

  const commandId = sha256({
    mode: req.mode,
    commandText: req.commandText,
    prompt: req.prompt,
    path: req.path,
    payloadHash,
    bucket: Math.floor(now.getTime() / 5000),
  }).slice(0, 32);

  const sessionId = sha256({
    actorId: req.context.actorId,
    workspaceId: req.context.workspaceId,
    window: Math.floor(now.getTime() / 300_000),
  }).slice(0, 32);

  const profile = buildCommandProfile(req);
  const isMutation = ["write", "delete", "payment", "deploy", "admin"].includes(profile.actionType);

  return {
    workspaceId: req.context.workspaceId,
    customerName: req.context.customerName,
    runtime: {
      agentId: `hermes-${req.context.actorId}`,
      agentName: `Hermes/${req.mode}`,
      agentType: "ai-agent",
      sessionId,
      agentWillExecuteAction: true,
      requiresResultCallback: true,
      resultCallbackUrl: "/api/dsg/agent-command-gate/result",
    },
    command: {
      commandId,
      actionType: profile.actionType,
      targetSystemId: profile.targetSystemId,
      operationName: profile.operationName,
      riskLevel: profile.riskLevel,
      dataClasses: profile.dataClasses,
      path: req.path,
      payloadHash,
      idempotencyKey: isMutation ? sha256({ commandId, mode: req.mode }).slice(0, 24) : undefined,
      rollbackPlanId: isMutation ? `rollback-${commandId.slice(0, 16)}` : undefined,
      planHash: req.context.planHash,
    },
    rbac: {
      actorId: req.context.actorId,
      role: req.context.role,
      permissions: req.context.permissions,
      approvalRequestId: req.context.approvalRequestId,
      approvalDecision: req.context.approvalDecision,
      approvedBy: req.context.approvedBy,
      approvedAt: req.context.approvedAt,
    },
    audit: {
      preAuditEventId: req.context.proof?.audit?.preAuditEventId ?? "",
      ledgerId: req.context.proof?.audit?.ledgerId ?? "",
      chainHeadHash: req.context.proof?.audit?.chainHeadHash ?? "",
    },
    evidence: {
      evidenceManifestId: req.context.proof?.evidence?.evidenceManifestId ?? "",
      policySnapshotHash: req.context.proof?.evidence?.policySnapshotHash ?? "",
      runtimeBindingHash: req.context.proof?.evidence?.runtimeBindingHash,
    },
  };
}

// ─── execution prompt builder ────────────────────────────────────────────────

function buildHermesExecutionPrompt(
  req: HermesPluginRequest,
  gateResult: AgentCommandGateResult,
): string {
  const env = gateResult.actionEnvelope!;
  const callback = env.mustReturnResultTo;

  switch (req.mode) {
    case "local_operator":
      return [
        `DSG PASS — Hermes may execute the following shell command on the local machine.`,
        `Command: ${req.commandText}`,
        `Envelope ID: ${env.envelopeId}`,
        `Expires at: ${env.expiresAt}`,
        `After execution, post the observed result to: ${callback}`,
      ].join("\n");

    case "gated_executor":
      return [
        `DSG PASS — Hermes may execute the gated command.`,
        `Command: ${req.commandText ?? req.prompt}`,
        `Envelope ID: ${env.envelopeId}`,
        `Expires at: ${env.expiresAt}`,
        `After execution, post the observed result to: ${callback}`,
      ].join("\n");

    case "local_proxy":
      return [
        `DSG PASS — Hermes may start a local proxy server on localhost only.`,
        `Command: ${req.commandText}`,
        `Envelope ID: ${env.envelopeId}`,
        `Expires at: ${env.expiresAt}`,
        `CRITICAL: Proxy MUST bind to 127.0.0.1/localhost only. Do NOT bind to 0.0.0.0.`,
        `After starting, post the result (port, pid, status) to: ${callback}`,
      ].join("\n");

    case "github_pr_assistant":
      return [
        `DSG PASS — Hermes may assist with GitHub PR ${req.prNumber ?? "(new)"}.`,
        `Prompt: ${req.prompt}`,
        `Envelope ID: ${env.envelopeId}`,
        `Expires at: ${env.expiresAt}`,
        `CRITICAL: Hermes may NOT trigger auto-merge. Human review is required before merge.`,
        `After completing PR actions, post the result (PR URL, changed files, status) to: ${callback}`,
      ].join("\n");

    case "evidence_generator":
      return [
        `DSG PASS — Hermes may generate evidence artifacts.`,
        `Prompt: ${req.prompt}`,
        `Envelope ID: ${env.envelopeId}`,
        `Expires at: ${env.expiresAt}`,
        `After generating, post the evidence item IDs and manifest hash to: ${callback}`,
      ].join("\n");

    case "browser_qa":
      return [
        `DSG PASS — Hermes may open the browser and perform QA.`,
        `Target: ${req.path ?? req.url}`,
        `Prompt: ${req.prompt}`,
        `Envelope ID: ${env.envelopeId}`,
        `Expires at: ${env.expiresAt}`,
        `After QA, post the observed result (console errors, broken routes, CTA status) to: ${callback}`,
      ].join("\n");

    case "x_search_signal":
      return [
        `DSG PASS — Hermes may query X/Twitter for signals.`,
        `Query: ${req.query ?? req.prompt}`,
        `Envelope ID: ${env.envelopeId}`,
        `Expires at: ${env.expiresAt}`,
        `IMPORTANT: X search results are SIGNALS ONLY. They must be reviewed before being treated as verified truth.`,
        `After searching, post the observed signal data (not conclusions) to: ${callback}`,
      ].join("\n");
  }
}

// ─── main export ─────────────────────────────────────────────────────────────

export function evaluateHermesPluginRequest(
  req: HermesPluginRequest,
  now: Date = new Date(),
): HermesPluginEvaluation {
  const evaluatedAt = now.toISOString();

  const preflightBlock = runPreflightChecks(req);
  if (preflightBlock) {
    return {
      pluginVersion: HERMES_PLUGIN_VERSION,
      mode: req.mode,
      canExecute: false,
      decision: "BLOCK",
      status: "HERMES_BLOCKED",
      preflightBlock,
      reasons: ["preflight_block", `preflight:${preflightBlock.rule}`],
      evaluatedAt,
      truthBoundary:
        "DSG Hermes Plugin blocked this request before gate evaluation. Hermes must not execute.",
    };
  }

  // observe-only modes (browser_qa, x_search_signal) pass without full audit binding
  const profile = buildCommandProfile(req);
  if (profile.actionType === "observe" && !req.context.proof) {
    const prompt = [
      `DSG PASS (observe, no-audit) — Hermes may ${req.mode === "browser_qa" ? "open browser and QA" : "search"}.`,
      req.path ?? req.url ?? req.query ?? req.prompt ?? "",
      "No mutation will occur. No result callback required.",
    ].filter(Boolean).join("\n");
    return {
      pluginVersion: HERMES_PLUGIN_VERSION,
      mode: req.mode,
      canExecute: true,
      decision: "PASS",
      status: "HERMES_EXECUTE",
      hermesExecutionPrompt: prompt,
      reasons: ["observe_no_audit_pass"],
      evaluatedAt,
      truthBoundary:
        "DSG Hermes Plugin approved this observe-only action without audit binding. No mutations. No result callback required.",
    };
  }

  const gateRequest = buildGateRequest(req, now);
  const gateResult = evaluateAgentCommandGate(gateRequest, now);

  const canExecute = gateResult.canAgentExecute;
  const decision = gateResult.decision;
  const status: HermesPluginEvaluation["status"] = canExecute
    ? "HERMES_EXECUTE"
    : decision === "REVIEW"
      ? "HERMES_REVIEW_REQUIRED"
      : "HERMES_BLOCKED";

  return {
    pluginVersion: HERMES_PLUGIN_VERSION,
    mode: req.mode,
    canExecute,
    decision,
    status,
    gateResult,
    hermesExecutionPrompt: canExecute ? buildHermesExecutionPrompt(req, gateResult) : undefined,
    actionEnvelope: gateResult.actionEnvelope,
    reasons: gateResult.reasons,
    evaluatedAt,
    truthBoundary: canExecute
      ? "DSG Hermes Plugin has approved this Hermes action. Hermes may execute, then must post the observed result back to DSG for audit and evidence recording."
      : "DSG Hermes Plugin has not approved this Hermes action. REVIEW or BLOCK means Hermes must not execute.",
  };
}

// ─── internal utilities ───────────────────────────────────────────────────────

function sha256(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortStable(value));
}

function sortStable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortStable);
  if (value !== null && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortStable((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}
