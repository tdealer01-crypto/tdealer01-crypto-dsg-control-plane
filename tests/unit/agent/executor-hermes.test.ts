import { describe, it, expect, vi } from "vitest";
import { executeToolSafely } from "../../../lib/agent/executor";
import type { AgentContext } from "../../../lib/agent/context";
import type { AgentTool } from "../../../lib/agent/tools";

vi.mock("../../../lib/gate", () => ({
  resolveGate: () => ({
    evaluate: async () => ({ decision: "PASS", reason: "ok" }),
  }),
}));

const REAL_PROOF = {
  audit: {
    preAuditEventId: "audit_evt_001",
    ledgerId: "ledger_001",
    chainHeadHash: "chain_hash_001",
  },
  evidence: {
    evidenceManifestId: "manifest_001",
    policySnapshotHash: "policy_hash_001",
  },
};

const BASE_CONTEXT: AgentContext = {
  orgId: "org_test",
  role: "operator",
  origin: "http://localhost:3000",
  authHeader: "Bearer test-token",
  cookieHeader: "",
  approvalToken: "approved-by-user-token-ok",
};

const WRITE_TOOL: AgentTool = {
  id: "checkpoint",
  name: "Create Runtime Checkpoint",
  description: "checkpoint",
  parameters: { agent_id: { type: "string", required: true, description: "agent id" } },
  riskLevel: "write",
  requiredRole: "checkpoint",
  execute: async () => ({ ok: true, checkpointId: "cp_001" }),
};

const READ_TOOL: AgentTool = {
  id: "readiness",
  name: "Check Readiness",
  description: "readiness",
  parameters: {},
  riskLevel: "read",
  requiredRole: "monitor",
  execute: async () => ({ ready: true }),
};

const BROWSER_TOOL: AgentTool = {
  id: "browser_navigate",
  name: "Browser Navigate",
  description: "browser",
  parameters: {
    agent_id: { type: "string", required: true, description: "agent" },
    url: { type: "string", required: true, description: "url" },
  },
  riskLevel: "critical",
  requiredRole: "execute",
  execute: async () => ({ navigated: true }),
};

// ─── read tools bypass hermes entirely ──────────────────────────────────────

describe("read tools", () => {
  it("execute directly without hermes gate", async () => {
    const result = await executeToolSafely(READ_TOOL, {}, BASE_CONTEXT);
    expect(result).toEqual({ ready: true });
  });
});

// ─── approval check ──────────────────────────────────────────────────────────

describe("approval check", () => {
  it("blocks without approval token", async () => {
    const ctx = { ...BASE_CONTEXT, approvalToken: undefined };
    const result = await executeToolSafely(WRITE_TOOL, { agent_id: "ag_001" }, ctx) as Record<string, unknown>;
    expect(result.blocked).toBe(true);
    expect(result.requiresApproval).toBe(true);
  });
});

// ─── hermes gate — write tool with proof ────────────────────────────────────

describe("hermes gate on write tool", () => {
  it("PASS and executes when proof is present", async () => {
    const ctx = { ...BASE_CONTEXT, hermesProof: REAL_PROOF };
    const result = await executeToolSafely(WRITE_TOOL, { agent_id: "ag_001" }, ctx) as Record<string, unknown>;
    expect(result.blocked).toBeUndefined();
    expect(result.ok).toBe(true);
  });

  it("BLOCK when proof is missing", async () => {
    const ctx = { ...BASE_CONTEXT, hermesProof: undefined };
    const result = await executeToolSafely(WRITE_TOOL, { agent_id: "ag_001" }, ctx) as Record<string, unknown>;
    expect(result.blocked).toBe(true);
    expect(result.hermesDecision).toBe("BLOCK");
    expect(String(result.reason)).toContain("DSG Hermes gate");
    console.log("\n--- write tool BLOCK (no proof) ---");
    console.log("hermesStatus:", result.hermesStatus);
    console.log("reasons:", result.reasons);
  });
});

// ─── hermes gate — browser_navigate maps to browser_qa ──────────────────────

describe("browser_navigate maps to browser_qa mode", () => {
  it("PASS with proof", async () => {
    const ctx = { ...BASE_CONTEXT, role: "org_admin" as const, hermesProof: REAL_PROOF };
    const result = await executeToolSafely(
      BROWSER_TOOL,
      { agent_id: "ag_001", url: "/proofgate" },
      ctx,
    ) as Record<string, unknown>;
    expect(result.blocked).toBeUndefined();
    expect(result.navigated).toBe(true);
    console.log("\n--- browser_navigate PASS (browser_qa mode) ---");
  });

  it("PASS without proof (observe-no-audit fast path)", async () => {
    const ctx = { ...BASE_CONTEXT, role: "org_admin" as const };
    const result = await executeToolSafely(
      BROWSER_TOOL,
      { agent_id: "ag_001", url: "/proofgate" },
      ctx,
    ) as Record<string, unknown>;
    // observe mode passes without proof — no mutation risk
    expect(result.blocked).toBeUndefined();
    expect(result.navigated).toBe(true);
    console.log("\n--- browser_navigate PASS (no proof, observe fast path) ---");
  });
});

// ─── preflight block passes through from hermes ──────────────────────────────

describe("preflight blocks", () => {
  it("BLOCK when tool prompt implies .env access", async () => {
    const sensitiveEnvTool: AgentTool = {
      ...WRITE_TOOL,
      id: "local_operator",
      name: "cat .env.production",
    };
    const ctx = { ...BASE_CONTEXT, hermesProof: REAL_PROOF };
    const result = await executeToolSafely(
      sensitiveEnvTool,
      { agent_id: "ag_001" },
      ctx,
    ) as Record<string, unknown>;
    expect(result.blocked).toBe(true);
    expect(String(result.reason)).toContain("Hermes may not read");
    console.log("\n--- preflight .env BLOCK via executor ---");
    console.log("reason:", result.reason);
  });
});
