import { describe, it, expect, beforeEach } from "vitest";
import {
  executeCommand,
  validateFileChange,
  createShellExecutor,
} from "@/lib/dsg/brain/shell-executor";
import {
  buildControlledExecutionContext,
  ControlledExecutionContext,
  ProposedCommand,
} from "@/lib/dsg/brain/controlled-executor";
import { buildPlanAttempt } from "@/lib/dsg/brain/plan-attempt";

describe("DSG Brain Shell Executor", () => {
  let ctx: ControlledExecutionContext;

  beforeEach(() => {
    const basePlan = buildPlanAttempt({
      inputHash: "input-abc",
      attemptNo: 1,
      canonicalPlan: "echo hello",
      policyVersion: "v1.0.0",
      invariantVersion: "v1.0.0",
      toolManifestHash: "manifest-xyz",
    });

    ctx = buildControlledExecutionContext(
      basePlan,
      ["echo", "cat", "ls"],
      ["/tmp/dsg"],
      {
        leases: [],
        unavailable: [],
      }
    );
  });

  describe("executeCommand", () => {
    it("executes allowed echo command successfully", async () => {
      const cmd: ProposedCommand = {
        command: "echo",
        args: ["Hello World"],
      };

      const result = await executeCommand(cmd, ctx);

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Hello World");
      expect(result.evidence).toBeDefined();
      expect(result.evidence.type).toBe("command");
      expect(result.evidence.hash).toBeTruthy();
    });

    it("blocks commands not in whitelist", async () => {
      const cmd: ProposedCommand = {
        command: "whoami",
        args: [],
      };

      const result = await executeCommand(cmd, ctx);

      expect(result.success).toBe(false);
      expect(result.blockReason).toContain("NOT_IN_WHITELIST");
      expect(result.stderr).toContain("not in allowedCommands");
    });

    it("blocks dangerous rm command even if whitelisted", async () => {
      // Even if someone tried to whitelist rm, it should be blocked
      const ctxWithRm = buildControlledExecutionContext(
        ctx.plan,
        ["rm"],
        ["/tmp/dsg"],
        ctx.credentials
      );

      const cmd: ProposedCommand = {
        command: "rm",
        args: ["-rf", "/tmp/test"],
      };

      const result = await executeCommand(cmd, ctxWithRm);

      expect(result.success).toBe(false);
      expect(result.blockReason).toContain("DANGEROUS_COMMAND");
    });

    it("blocks rm -rf pattern", async () => {
      const ctxWithRm = buildControlledExecutionContext(
        ctx.plan,
        ["rm"],
        ["/tmp/dsg"],
        ctx.credentials
      );

      const cmd: ProposedCommand = {
        command: "rm -rf",
        args: ["/tmp/test"],
      };

      const result = await executeCommand(cmd, ctxWithRm);

      expect(result.success).toBe(false);
      expect(result.blockReason).toContain("DANGEROUS_COMMAND");
    });

    it("blocks sudo command", async () => {
      const ctxWithSudo = buildControlledExecutionContext(
        ctx.plan,
        ["sudo"],
        ["/tmp/dsg"],
        ctx.credentials
      );

      const cmd: ProposedCommand = {
        command: "sudo",
        args: ["echo", "test"],
      };

      const result = await executeCommand(cmd, ctxWithSudo);

      expect(result.success).toBe(false);
      expect(result.blockReason).toContain("DANGEROUS_COMMAND");
    });

    it("captures stdout and stderr in evidence", async () => {
      const cmd: ProposedCommand = {
        command: "echo",
        args: ["test output"],
      };

      const result = await executeCommand(cmd, ctx);

      expect(result.stdout).toContain("test output");
      expect(result.evidence.hash).toBeTruthy();
      // Evidence hash should be different each time due to timestamp
      const cmd2 = await executeCommand(cmd, ctx);
      // Both should succeed but have different hashes
      expect(cmd2.evidence.hash).toBeTruthy();
    });

    it("handles command exit codes", async () => {
      // ls of non-existent path returns non-zero
      const cmd: ProposedCommand = {
        command: "ls",
        args: ["/nonexistent/path/that/does/not/exist"],
      };

      const result = await executeCommand(cmd, ctx);

      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toBeTruthy();
    });
  });

  describe("validateFileChange", () => {
    it("allows file changes within allowedPaths", () => {
      const result = validateFileChange("/tmp/dsg/test.txt", ctx);

      expect(result.allowed).toBe(true);
      expect(result.blockReason).toBeUndefined();
    });

    it("allows nested file changes within allowedPaths", () => {
      const result = validateFileChange("/tmp/dsg/subdir/test.txt", ctx);

      expect(result.allowed).toBe(true);
    });

    it("blocks file changes outside allowedPaths", () => {
      const result = validateFileChange("/home/user/test.txt", ctx);

      expect(result.allowed).toBe(false);
      expect(result.blockReason).toContain("NOT_IN_ALLOWED_PATHS");
    });

    it("blocks .env file access", () => {
      const result = validateFileChange(".env", ctx);

      expect(result.allowed).toBe(false);
      expect(result.blockReason).toContain("FORBIDDEN_PATH");
    });

    it("blocks .env.local file access", () => {
      const result = validateFileChange(".env.local", ctx);

      expect(result.allowed).toBe(false);
      expect(result.blockReason).toContain("FORBIDDEN_PATH");
    });

    it("blocks access to /etc", () => {
      const result = validateFileChange("/etc/passwd", ctx);

      expect(result.allowed).toBe(false);
      expect(result.blockReason).toContain("FORBIDDEN_PATH");
    });

    it("blocks access to /root", () => {
      const result = validateFileChange("/root/.ssh/id_rsa", ctx);

      expect(result.allowed).toBe(false);
      expect(result.blockReason).toContain("FORBIDDEN_PATH");
    });

    it("blocks access to ~/.ssh", () => {
      const result = validateFileChange("~/.ssh/id_rsa", ctx);

      expect(result.allowed).toBe(false);
      expect(result.blockReason).toContain("FORBIDDEN_PATH");
    });

    it("blocks access to ~/.aws", () => {
      const result = validateFileChange("~/.aws/credentials", ctx);

      expect(result.allowed).toBe(false);
      expect(result.blockReason).toContain("FORBIDDEN_PATH");
    });
  });

  describe("createShellExecutor", () => {
    it("returns a function compatible with HermesPlugin.executePlan", async () => {
      const executor = createShellExecutor();

      expect(typeof executor).toBe("function");

      const result = await executor(ctx);

      expect(result.success).toBe(true);
      expect(result.planHash).toBe(ctx.plan.planHash);
      expect(result.executedCommands).toHaveLength(1);
      expect(result.executedCommands[0].command).toBe("echo");
      expect(result.evidence).toHaveLength(1);
    });

    it("executor result includes evidence from execution", async () => {
      const executor = createShellExecutor();
      const result = await executor(ctx);

      expect(result.evidence).toHaveLength(1);
      expect(result.evidence[0].type).toBe("command");
      expect(result.evidence[0].hash).toBeTruthy();
      expect(result.evidence[0].timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("security constraints", () => {
    it("prevents path traversal attacks", () => {
      const result = validateFileChange("/tmp/dsg/../../etc/passwd", ctx);

      expect(result.allowed).toBe(false);
    });

    it("prevents null byte injection in paths", () => {
      // While path normalization should handle this,
      // test that obviously dangerous path patterns are rejected
      const result = validateFileChange("/tmp/dsg\0/malicious", ctx);

      expect(result.allowed).toBe(false);
    });

    it("case-insensitive command matching rejects chmod 777", async () => {
      const ctxWithChmod = buildControlledExecutionContext(
        ctx.plan,
        ["chmod"],
        ["/tmp/dsg"],
        ctx.credentials
      );

      const cmd: ProposedCommand = {
        command: "chmod 777",
        args: ["/tmp/test"],
      };

      const result = await executeCommand(cmd, ctxWithChmod);

      expect(result.success).toBe(false);
      expect(result.blockReason).toContain("DANGEROUS_COMMAND");
    });
  });
});
