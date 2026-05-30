import { describe, it, expect } from "vitest";
import {
  checkConformance,
  assertConformance,
} from "../../lib/dsg/brain/conformance-gate";
import {
  buildControlledExecutionContext,
  createCredentialLease,
} from "../../lib/dsg/brain/controlled-executor";
import { buildPlanAttempt } from "../../lib/dsg/brain/plan-attempt";

describe("DSG Brain Conformance Gate", () => {
  const basePlan = buildPlanAttempt({
    inputHash: "input-abc",
    attemptNo: 1,
    canonicalPlan: "echo hello",
    policyVersion: "v1.0.0",
    invariantVersion: "v1.0.0",
    toolManifestHash: "manifest-xyz",
  });

  const credentials = {
    leases: [
      createCredentialLease("ANTHROPIC_API_KEY", "sk-ant-secret", 60_000),
    ],
    unavailable: [],
  };

  const ctx = buildControlledExecutionContext(
    basePlan,
    ["echo", "cat", "ls"],
    ["/tmp/dsg", "/var/dsg"],
    credentials
  );

  it("approves conformant execution result", () => {
    const result = {
      success: true,
      planHash: basePlan.planHash,
      executedCommands: [{ command: "echo", args: ["hello"] }],
      fileChanges: [{ path: "/tmp/dsg/output.txt", operation: "write" as const }],
      evidence: [{ type: "command" as const, id: "cmd-1", hash: "abc", timestamp: Date.now() }],
    };

    const report = checkConformance(ctx, result);
    expect(report.approved).toBe(true);
    expect(report.violations).toHaveLength(0);
  });

  it("BLOCKS when planHash mismatches", () => {
    const result = {
      success: true,
      planHash: "tampered-hash",
      executedCommands: [{ command: "echo", args: ["hello"] }],
      fileChanges: [],
      evidence: [{ type: "command" as const, id: "cmd-1", hash: "abc", timestamp: Date.now() }],
    };

    const report = checkConformance(ctx, result);
    expect(report.approved).toBe(false);
    expect(report.violations.some((v) => v.rule === "planHash-match")).toBe(true);
  });

  it("BLOCKS when command is not in allowedCommands", () => {
    const result = {
      success: true,
      planHash: basePlan.planHash,
      executedCommands: [{ command: "rm", args: ["-rf", "/"] }],
      fileChanges: [],
      evidence: [{ type: "command" as const, id: "cmd-1", hash: "abc", timestamp: Date.now() }],
    };

    const report = checkConformance(ctx, result);
    expect(report.approved).toBe(false);
    expect(report.violations.some((v) => v.rule === "allowed-commands")).toBe(true);
  });

  it("BLOCKS when file path is not in allowedPaths", () => {
    const result = {
      success: true,
      planHash: basePlan.planHash,
      executedCommands: [{ command: "echo", args: ["hello"] }],
      fileChanges: [{ path: "/etc/passwd", operation: "write" as const }],
      evidence: [{ type: "command" as const, id: "cmd-1", hash: "abc", timestamp: Date.now() }],
    };

    const report = checkConformance(ctx, result);
    expect(report.approved).toBe(false);
    expect(report.violations.some((v) => v.rule === "allowed-paths")).toBe(true);
  });

  it("BLOCKS path traversal attacks (../../etc/passwd)", () => {
    const result = {
      success: true,
      planHash: basePlan.planHash,
      executedCommands: [{ command: "echo", args: ["hello"] }],
      fileChanges: [{ path: "/tmp/dsg/../../etc/passwd", operation: "write" as const }],
      evidence: [{ type: "command" as const, id: "cmd-1", hash: "abc", timestamp: Date.now() }],
    };

    const report = checkConformance(ctx, result);
    expect(report.approved).toBe(false);
    expect(report.violations.some((v) => v.rule === "allowed-paths")).toBe(true);
    expect(report.violations[0].message).toContain("canonical:");
  });

  it("BLOCKS null byte injection in paths", () => {
    const result = {
      success: true,
      planHash: basePlan.planHash,
      executedCommands: [{ command: "echo", args: ["hello"] }],
      fileChanges: [{ path: "/tmp/dsg/file.txt\0../../etc/passwd", operation: "write" as const }],
      evidence: [{ type: "command" as const, id: "cmd-1", hash: "abc", timestamp: Date.now() }],
    };

    const report = checkConformance(ctx, result);
    expect(report.approved).toBe(false);
    expect(report.violations.some((v) => v.rule === "allowed-paths")).toBe(true);
    expect(report.violations[0].message).toContain("canonicalization");
  });

  it("allows nested paths under allowedPaths", () => {
    const result = {
      success: true,
      planHash: basePlan.planHash,
      executedCommands: [{ command: "echo", args: ["hello"] }],
      fileChanges: [{ path: "/tmp/dsg/nested/deep/file.txt", operation: "write" as const }],
      evidence: [{ type: "command" as const, id: "cmd-1", hash: "abc", timestamp: Date.now() }],
    };

    const report = checkConformance(ctx, result);
    expect(report.approved).toBe(true);
  });

  it("BLOCKS partial path prefix match (e.g., /tmp/dsg-extra)", () => {
    const result = {
      success: true,
      planHash: basePlan.planHash,
      executedCommands: [{ command: "echo", args: ["hello"] }],
      fileChanges: [{ path: "/tmp/dsg-extra/malicious.txt", operation: "write" as const }],
      evidence: [{ type: "command" as const, id: "cmd-1", hash: "abc", timestamp: Date.now() }],
    };

    const report = checkConformance(ctx, result);
    expect(report.approved).toBe(false);
    expect(report.violations.some((v) => v.rule === "allowed-paths")).toBe(true);
  });

  it("BLOCKS when evidence is missing", () => {
    const result = {
      success: true,
      planHash: basePlan.planHash,
      executedCommands: [{ command: "echo", args: ["hello"] }],
      fileChanges: [],
      evidence: [],
    };

    const report = checkConformance(ctx, result);
    expect(report.approved).toBe(false);
    expect(report.violations.some((v) => v.rule === "evidence-required")).toBe(true);
  });

  it("throws on assertConformance when violations exist", () => {
    const result = {
      success: true,
      planHash: "bad-hash",
      executedCommands: [],
      fileChanges: [],
      evidence: [],
    };

    expect(() => assertConformance(ctx, result)).toThrow("CONFORMANCE BLOCK");
  });

  it("does not throw on assertConformance when conformant", () => {
    const result = {
      success: true,
      planHash: basePlan.planHash,
      executedCommands: [{ command: "echo", args: ["hello"] }],
      fileChanges: [],
      evidence: [{ type: "command" as const, id: "cmd-1", hash: "abc", timestamp: Date.now() }],
    };

    expect(() => assertConformance(ctx, result)).not.toThrow();
  });
});
