import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import {
  executeFileRead,
  executeFileWrite,
  executeFileEdit,
  executeGlobSearch,
  executeGrepSearch,
  executeTool,
  executeToolSequence,
  type ControlledExecutionContext,
  type ExecutionGrant,
} from "@/lib/dsg/brain/tool-executor";
import { buildExecutionGrant } from "@/lib/dsg/brain/controlled-executor";
import { buildPlanAttempt } from "@/lib/dsg/brain/plan-attempt";
import { sha256Hash } from "@/lib/dsg/brain/hash-utils";

describe("Tool Executor", () => {
  let testDir: string;
  let ctx: ControlledExecutionContext;

  beforeEach(() => {
    testDir = join(process.cwd(), ".test-tool-executor-" + Date.now());
    mkdirSync(testDir, { recursive: true });

    // Create mock plan and context
    const plan = buildPlanAttempt({
      canonicalPlan: "test-plan",
      policyVersion: "1.0",
      invariantVersion: "1.0",
      toolManifestHash: sha256Hash("test-manifest"),
      inputHash: sha256Hash("test-input"),
      attemptNo: 1,
    });

    ctx = {
      plan,
      grant: buildExecutionGrant(plan),
      credentials: { leases: [], unavailable: [] },
      allowedCommands: ["ls", "echo"],
      allowedPaths: [testDir],
    };
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe("executeFileRead", () => {
    it("should read file content", () => {
      const testFile = join(testDir, "test.txt");
      writeFileSync(testFile, "line 1\nline 2\nline 3");

      const result = executeFileRead({ type: "fs.read", path: testFile }, ctx);

      expect(result.success).toBe(true);
      expect(result.tool).toBe("fs.read");
      expect(result.data).toHaveProperty("content");
      expect(result.data.lines).toBe(3);
      expect(result.hash).toBeTruthy();
    });

    it("should fail on file not found", () => {
      const result = executeFileRead(
        { type: "fs.read", path: join(testDir, "nonexistent.txt") },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.blockReason).toContain("not found");
    });

    it("should fail on path outside allowedPaths", () => {
      const result = executeFileRead(
        { type: "fs.read", path: "/etc/passwd" },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.blockReason).toContain("CONFORMANCE BLOCK");
    });

    it("should support offset and limit", () => {
      const testFile = join(testDir, "test.txt");
      writeFileSync(testFile, "line 1\nline 2\nline 3\nline 4\n");

      const result = executeFileRead(
        {
          type: "fs.read",
          path: testFile,
          offset: 1,
          limit: 2,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data.readLines).toBe(2);
    });
  });

  describe("executeFileWrite", () => {
    it("should write file content", () => {
      const testFile = join(testDir, "write-test.txt");
      // Create empty file first to satisfy precondition
      writeFileSync(testFile, "");

      const result = executeFileWrite(
        {
          type: "fs.write",
          path: testFile,
          content: "new content",
          requirePrecondition: false,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.tool).toBe("fs.write");
      expect(readFileSync(testFile, "utf-8")).toBe("new content");
    });

    it("should fail on path outside allowedPaths", () => {
      const result = executeFileWrite(
        {
          type: "fs.write",
          path: "/etc/passwd",
          content: "bad",
        },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.blockReason).toContain("CONFORMANCE BLOCK");
    });

    it("should enforce precondition by default", () => {
      const result = executeFileWrite(
        {
          type: "fs.write",
          path: join(testDir, "nonexistent.txt"),
          content: "content",
        },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.blockReason).toContain("does not exist");
    });
  });

  describe("executeFileEdit", () => {
    it("should edit file with exact match", () => {
      const testFile = join(testDir, "edit-test.ts");
      writeFileSync(testFile, "const x = 1;\nconst y = 2;\n");

      const result = executeFileEdit(
        {
          type: "fs.edit",
          path: testFile,
          oldString: "const x = 1;",
          newString: "const x = 10;",
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data.replacements).toBe(1);
      expect(readFileSync(testFile, "utf-8")).toContain("const x = 10;");
    });

    it("should fail on multiple matches without replaceAll", () => {
      const testFile = join(testDir, "multi-test.ts");
      writeFileSync(testFile, "const x = 1;\nconst x = 2;\n");

      const result = executeFileEdit(
        {
          type: "fs.edit",
          path: testFile,
          oldString: "const x",
          newString: "let x",
        },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.blockReason).toContain("not unique");
    });

    it("should replace all with replaceAll flag", () => {
      const testFile = join(testDir, "replaceall-test.ts");
      writeFileSync(testFile, "foo bar foo\n");

      const result = executeFileEdit(
        {
          type: "fs.edit",
          path: testFile,
          oldString: "foo",
          newString: "baz",
          replaceAll: true,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data.replacements).toBe(2);
      expect(readFileSync(testFile, "utf-8")).toContain("baz bar baz");
    });

    it("should fail if string not found", () => {
      const testFile = join(testDir, "notfound-test.ts");
      writeFileSync(testFile, "const x = 1;\n");

      const result = executeFileEdit(
        {
          type: "fs.edit",
          path: testFile,
          oldString: "nonexistent",
          newString: "replacement",
        },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.blockReason).toContain("not found");
    });
  });

  describe("executeGlobSearch", () => {
    it("should find files matching pattern", () => {
      writeFileSync(join(testDir, "file1.ts"), "");
      writeFileSync(join(testDir, "file2.ts"), "");
      writeFileSync(join(testDir, "file3.js"), "");

      const result = executeGlobSearch(
        {
          type: "search.glob",
          pattern: "*.ts",
          baseDir: testDir,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(2);
      expect(result.data.matches).toHaveLength(2);
    });

    it("should return empty array when no matches", () => {
      const result = executeGlobSearch(
        {
          type: "search.glob",
          pattern: "*.nonexistent",
          baseDir: testDir,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(0);
      expect(result.data.matches).toHaveLength(0);
    });
  });

  describe("executeGrepSearch", () => {
    it("should find regex matches in files", () => {
      writeFileSync(
        join(testDir, "test.ts"),
        'const x = "hello";\nconst y = "world";\n'
      );

      const result = executeGrepSearch(
        {
          type: "search.grep",
          pattern: "const",
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data.results.length).toBeGreaterThan(0);
    });

    it("should support case insensitive search", () => {
      writeFileSync(
        join(testDir, "test.ts"),
        'const X = 1;\nconst x = 2;\n'
      );

      const result = executeGrepSearch(
        {
          type: "search.grep",
          pattern: "CONST",
          caseInsensitive: true,
        },
        ctx
      );

      expect(result.success).toBe(true);
    });
  });

  describe("executeTool dispatcher", () => {
    it("should route to correct executor", () => {
      const testFile = join(testDir, "dispatch-test.txt");
      writeFileSync(testFile, "original content");

      const result = executeTool(
        { type: "fs.read", path: testFile },
        ctx
      );

      expect(result.tool).toBe("fs.read");
      expect(result.success).toBe(true);
    });

    it("should handle unknown tool type", () => {
      const result = executeTool(
        { type: "unknown.tool" as any },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.blockReason).toContain("Unknown tool");
    });
  });

  describe("executeToolSequence", () => {
    it("should execute operations in sequence", () => {
      const testFile = join(testDir, "sequence-test.ts");
      writeFileSync(testFile, "const x = 1;\n");

      const { results, evidence, blockReason } = executeToolSequence(
        [
          { type: "fs.read", path: testFile },
          {
            type: "fs.edit",
            path: testFile,
            oldString: "const x = 1",
            newString: "const x = 10",
          },
        ],
        ctx
      );

      expect(blockReason).toBeUndefined();
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(evidence).toHaveLength(2);
    });

    it("should stop on first failure", () => {
      const { results, blockReason } = executeToolSequence(
        [
          { type: "fs.read", path: join(testDir, "nonexistent.txt") },
          { type: "fs.read", path: join(testDir, "also-nonexistent.txt") },
        ],
        ctx
      );

      expect(blockReason).toBeTruthy();
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });
  });

  describe("evidence collection", () => {
    it("should collect evidence for each operation", () => {
      const testFile = join(testDir, "evidence-test.txt");
      writeFileSync(testFile, "test content");

      const result = executeFileRead({ type: "fs.read", path: testFile }, ctx);

      expect(result.evidence).toBeDefined();
      expect(result.evidence.type).toBe("file");
      expect(result.evidence.id).toBeTruthy();
      expect(result.evidence.hash).toBeTruthy();
      expect(result.evidence.timestamp).toBeTruthy();
    });
  });
});
