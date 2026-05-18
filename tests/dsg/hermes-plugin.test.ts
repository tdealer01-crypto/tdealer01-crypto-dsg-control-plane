import { describe, it, expect } from "vitest";
import { evaluateHermesPluginRequest, type HermesPluginRequest } from "../../lib/dsg/hermes-plugin";

const REAL_PROOF = {
  audit: {
    preAuditEventId: "audit_evt_real_001",
    ledgerId: "ledger_real_001",
    chainHeadHash: "real_chain_head_hash",
  },
  evidence: {
    evidenceManifestId: "evidence_manifest_real_001",
    policySnapshotHash: "real_policy_snapshot_hash",
  },
};

const BASE_CONTEXT = {
  workspaceId: "ws_test_001",
  actorId: "user_test_001",
  role: "operator" as const,
  permissions: ["tool:execute_low", "tool:execute_medium"],
};

// ─── browser_qa ─────────────────────────────────────────────────────────────

describe("browser_qa", () => {
  it("PASS when audit/evidence proof is present", () => {
    const req: HermesPluginRequest = {
      mode: "browser_qa",
      prompt: "Open /proofgate and check broken route, console error, CTA visibility",
      commandText: "browser qa /proofgate",
      path: "/proofgate",
      context: { ...BASE_CONTEXT, proof: REAL_PROOF },
    };
    const r = evaluateHermesPluginRequest(req);
    expect(r.decision).toBe("PASS");
    expect(r.canExecute).toBe(true);
    expect(r.status).toBe("HERMES_EXECUTE");
    expect(r.hermesExecutionPrompt).toContain("DSG PASS");
    expect(r.actionEnvelope?.envelopeId).toBeTruthy();
    console.log("\n--- browser_qa PASS ---");
    console.log("decision:", r.decision);
    console.log("envelopeId:", r.actionEnvelope?.envelopeId);
    console.log("expiresAt:", r.actionEnvelope?.expiresAt);
    console.log("prompt:\n", r.hermesExecutionPrompt);
  });

  it("BLOCK when audit/evidence proof is missing", () => {
    const req: HermesPluginRequest = {
      mode: "browser_qa",
      prompt: "Check /proofgate",
      path: "/proofgate",
      context: { ...BASE_CONTEXT },
    };
    const r = evaluateHermesPluginRequest(req);
    expect(r.decision).toBe("BLOCK");
    expect(r.canExecute).toBe(false);
    console.log("\n--- browser_qa BLOCK (no proof) ---");
    console.log("reasons:", r.reasons);
  });
});

// ─── local_operator ──────────────────────────────────────────────────────────

describe("local_operator", () => {
  it("PASS for read command with proof", () => {
    const req: HermesPluginRequest = {
      mode: "local_operator",
      commandText: "ls -la /tmp",
      context: { ...BASE_CONTEXT, proof: REAL_PROOF },
    };
    const r = evaluateHermesPluginRequest(req);
    expect(r.decision).toBe("PASS");
    expect(r.gateResult?.invariantChecks.find((c) => c.name === "audit_hook_bound")?.status).toBe("PASS");
    console.log("\n--- local_operator ls PASS ---");
    console.log("decision:", r.decision, "| actionType:", r.gateResult?.actionEnvelope?.allowedAction);
  });

  it("PREFLIGHT BLOCK when touching .env file", () => {
    const req: HermesPluginRequest = {
      mode: "local_operator",
      commandText: "cat .env.production",
      context: { ...BASE_CONTEXT, proof: REAL_PROOF },
    };
    const r = evaluateHermesPluginRequest(req);
    expect(r.decision).toBe("BLOCK");
    expect(r.preflightBlock?.rule).toBe("NO_SECRET_FILE_ACCESS");
    console.log("\n--- local_operator .env PREFLIGHT BLOCK ---");
    console.log("rule:", r.preflightBlock?.rule);
    console.log("reason:", r.preflightBlock?.reason);
  });

  it("PREFLIGHT BLOCK when deploy --prod", () => {
    const req: HermesPluginRequest = {
      mode: "local_operator",
      commandText: "vercel deploy --prod",
      context: { ...BASE_CONTEXT, proof: REAL_PROOF },
    };
    const r = evaluateHermesPluginRequest(req);
    expect(r.preflightBlock?.rule).toBe("NO_PRODUCTION_DEPLOY_WITHOUT_APPROVAL");
    console.log("\n--- local_operator deploy --prod PREFLIGHT BLOCK ---");
    console.log("rule:", r.preflightBlock?.rule);
  });
});

// ─── local_proxy ─────────────────────────────────────────────────────────────

describe("local_proxy", () => {
  it("PREFLIGHT BLOCK on ngrok", () => {
    const req: HermesPluginRequest = {
      mode: "local_proxy",
      commandText: "ngrok http 3000",
      context: { ...BASE_CONTEXT, proof: REAL_PROOF },
    };
    const r = evaluateHermesPluginRequest(req);
    expect(r.preflightBlock?.rule).toBe("NO_PUBLIC_PROXY");
    console.log("\n--- local_proxy ngrok PREFLIGHT BLOCK ---");
    console.log("rule:", r.preflightBlock?.rule);
  });

  it("PREFLIGHT BLOCK on 0.0.0.0", () => {
    const req: HermesPluginRequest = {
      mode: "local_proxy",
      commandText: "node proxy.js --host 0.0.0.0",
      context: { ...BASE_CONTEXT, proof: REAL_PROOF },
    };
    const r = evaluateHermesPluginRequest(req);
    expect(r.preflightBlock?.rule).toBe("NO_PUBLIC_PROXY");
    console.log("\n--- local_proxy 0.0.0.0 PREFLIGHT BLOCK ---");
  });
});

// ─── github_pr_assistant ─────────────────────────────────────────────────────

describe("github_pr_assistant", () => {
  it("PREFLIGHT BLOCK on auto-merge", () => {
    const req: HermesPluginRequest = {
      mode: "github_pr_assistant",
      prompt: "auto-merge PR #42 after CI passes",
      prNumber: 42,
      context: { ...BASE_CONTEXT, proof: REAL_PROOF },
    };
    const r = evaluateHermesPluginRequest(req);
    expect(r.preflightBlock?.rule).toBe("NO_AUTO_MERGE");
    console.log("\n--- github_pr_assistant auto-merge PREFLIGHT BLOCK ---");
    console.log("rule:", r.preflightBlock?.rule);
  });

  it("PASS for normal PR assist with proof", () => {
    const req: HermesPluginRequest = {
      mode: "github_pr_assistant",
      prompt: "Review PR #42 and add a summary comment",
      prNumber: 42,
      context: { ...BASE_CONTEXT, proof: REAL_PROOF },
    };
    const r = evaluateHermesPluginRequest(req);
    expect(r.decision).toBe("PASS");
    console.log("\n--- github_pr_assistant PASS ---");
    console.log("decision:", r.decision, "| op:", r.gateResult?.actionEnvelope?.operationName);
  });
});

// ─── x_search_signal ─────────────────────────────────────────────────────────

describe("x_search_signal", () => {
  it("PREFLIGHT BLOCK when X confirms used as truth", () => {
    const req: HermesPluginRequest = {
      mode: "x_search_signal",
      query: "x confirms DSG is trending",
      context: { ...BASE_CONTEXT, proof: REAL_PROOF },
    };
    const r = evaluateHermesPluginRequest(req);
    expect(r.preflightBlock?.rule).toBe("NO_X_SEARCH_UNREVIEWED_TRUTH_CLAIM");
    console.log("\n--- x_search_signal truth claim PREFLIGHT BLOCK ---");
    console.log("rule:", r.preflightBlock?.rule);
  });

  it("PASS for normal signal search with proof", () => {
    const req: HermesPluginRequest = {
      mode: "x_search_signal",
      query: "#ProofGate DSG launch signal",
      context: { ...BASE_CONTEXT, proof: REAL_PROOF },
    };
    const r = evaluateHermesPluginRequest(req);
    expect(r.decision).toBe("PASS");
    expect(r.hermesExecutionPrompt).toContain("SIGNALS ONLY");
    console.log("\n--- x_search_signal PASS ---");
    console.log("decision:", r.decision);
    console.log("prompt snippet:", r.hermesExecutionPrompt?.split("\n").slice(0, 3).join(" | "));
  });
});

// ─── evidence_generator ──────────────────────────────────────────────────────

describe("evidence_generator", () => {
  it("PASS with proof", () => {
    const req: HermesPluginRequest = {
      mode: "evidence_generator",
      prompt: "Generate deployment evidence for release v1.2.0",
      context: { ...BASE_CONTEXT, proof: REAL_PROOF },
    };
    const r = evaluateHermesPluginRequest(req);
    expect(r.decision).toBe("PASS");
    console.log("\n--- evidence_generator PASS ---");
    console.log("decision:", r.decision, "| target:", r.gateResult?.actionEnvelope?.targetSystemId);
  });
});

// ─── gated_executor ──────────────────────────────────────────────────────────

describe("gated_executor", () => {
  it("BLOCK without proof (gate rejects)", () => {
    const req: HermesPluginRequest = {
      mode: "gated_executor",
      commandText: "npm run build",
      context: { ...BASE_CONTEXT },
    };
    const r = evaluateHermesPluginRequest(req);
    expect(r.canExecute).toBe(false);
    console.log("\n--- gated_executor BLOCK (no proof) ---");
    console.log("reasons:", r.reasons.slice(0, 3));
  });

  it("PASS with proof", () => {
    const req: HermesPluginRequest = {
      mode: "gated_executor",
      commandText: "npm run build",
      context: { ...BASE_CONTEXT, proof: REAL_PROOF },
    };
    const r = evaluateHermesPluginRequest(req);
    expect(r.decision).toBe("PASS");
    console.log("\n--- gated_executor PASS ---");
    console.log("envelopeId:", r.actionEnvelope?.envelopeId);
  });
});
