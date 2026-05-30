/**
 * Conformance Gate for DSG Brain.
 * Validates execution results against approved plan constraints.
 * Any mismatch => BLOCK.
 */

import { resolve, normalize, isAbsolute } from "path";
import {
  ControlledExecutionContext,
  ControlledExecutionResult,
  ProposedCommand,
  ProposedFileChange,
} from "./controlled-executor";

export interface ConformanceViolation {
  rule: string;
  expected: unknown;
  actual: unknown;
  message: string;
}

export interface ConformanceReport {
  approved: boolean;
  planHash: string;
  violations: ConformanceViolation[];
}

/**
 * Normalize a path to its canonical absolute form to prevent traversal attacks.
 * Resolves .., ., and symbolic links (where supported).
 */
function canonicalizePath(inputPath: string, baseDir: string = process.cwd()): string {
  // Reject null bytes and obvious traversal patterns before normalization
  if (inputPath.includes("\0")) {
    throw new Error("CONFORMANCE BLOCK: Path contains null byte");
  }

  let resolved: string;
  if (isAbsolute(inputPath)) {
    resolved = normalize(inputPath);
  } else {
    resolved = normalize(resolve(baseDir, inputPath));
  }

  // Collapse any remaining traversal sequences (defense in depth)
  // After resolve+normalize, ".." should already be collapsed, but we double-check
  const parts = resolved.split("/").filter((p) => p !== "" && p !== ".");
  const stack: string[] = [];
  for (const part of parts) {
    if (part === "..") {
      if (stack.length > 0 && stack[stack.length - 1] !== "..") {
        stack.pop();
      } else {
        stack.push(part);
      }
    } else {
      stack.push(part);
    }
  }

  const collapsed = "/" + stack.join("/");
  return collapsed;
}

/**
 * Validate that an execution result conforms to the approved plan.
 * Returns a report; if violations exist, execution must be BLOCKED.
 */
export function checkConformance(
  ctx: ControlledExecutionContext,
  result: ControlledExecutionResult
): ConformanceReport {
  const violations: ConformanceViolation[] = [];

  // 1. Plan hash must match approved planHash
  if (result.planHash !== ctx.plan.planHash) {
    violations.push({
      rule: "planHash-match",
      expected: ctx.plan.planHash,
      actual: result.planHash,
      message: `Result planHash (${result.planHash}) does not match approved planHash (${ctx.plan.planHash})`,
    });
  }

  // 2. Every executed command must be in allowedCommands
  for (const cmd of result.executedCommands) {
    const cmdName = cmd.command.trim().toLowerCase();
    const allowed = ctx.allowedCommands.some(
      (allowed) => normalizeCommandString(allowed) === cmdName
    );
    if (!allowed) {
      violations.push({
        rule: "allowed-commands",
        expected: ctx.allowedCommands,
        actual: cmd,
        message: `Command "${cmd.command}" is not in allowedCommands`,
      });
    }
  }

  // 3. Every changed file must be in allowedPaths (with canonical path check)
  for (const change of result.fileChanges) {
    try {
      const canonicalPath = canonicalizePath(change.path);
      const allowed = ctx.allowedPaths.some((allowedPath) => {
        const canonicalAllowed = canonicalizePath(allowedPath);
        return isPathUnderCanonical(canonicalPath, canonicalAllowed);
      });
      if (!allowed) {
        violations.push({
          rule: "allowed-paths",
          expected: ctx.allowedPaths,
          actual: change.path,
          message: `File path "${change.path}" (canonical: ${canonicalPath}) is not under allowedPaths`,
        });
      }
    } catch (err) {
      violations.push({
        rule: "allowed-paths",
        expected: ctx.allowedPaths,
        actual: change.path,
        message: `File path "${change.path}" failed canonicalization: ${(err as Error).message}`,
      });
    }
  }

  // 4. Expected evidence must exist (non-empty evidence array)
  if (!result.evidence || result.evidence.length === 0) {
    violations.push({
      rule: "evidence-required",
      expected: ">=1 evidence items",
      actual: result.evidence?.length ?? 0,
      message: "Execution result must include at least one evidence item",
    });
  }

  return {
    approved: violations.length === 0,
    planHash: ctx.plan.planHash,
    violations,
  };
}

/**
 * Normalize a command to a comparable string.
 */
function normalizeCommand(cmd: ProposedCommand): string {
  return [cmd.command, ...cmd.args].join(" ").trim().toLowerCase();
}

function normalizeCommandString(cmd: string): string {
  return cmd.trim().toLowerCase();
}

/**
 * Check if a canonical path is under an allowed canonical base path.
 * Both inputs must already be canonicalized via canonicalizePath().
 */
function isPathUnderCanonical(canonicalPath: string, canonicalBase: string): boolean {
  // Exact match
  if (canonicalPath === canonicalBase) return true;

  // Must be a proper subdirectory (base + "/" + remainder)
  // Prevent partial string match (e.g., /tmp/dsg-extra matching /tmp/dsg)
  if (canonicalBase.endsWith("/")) {
    return canonicalPath.startsWith(canonicalBase);
  }
  return canonicalPath.startsWith(canonicalBase + "/");
}

/**
 * Convenience: throw if not conformant.
 */
export function assertConformance(
  ctx: ControlledExecutionContext,
  result: ControlledExecutionResult
): void {
  const report = checkConformance(ctx, result);
  if (!report.approved) {
    const summary = report.violations
      .map((v) => `[${v.rule}] ${v.message}`)
      .join("; ");
    throw new Error(`CONFORMANCE BLOCK: ${summary}`);
  }
}
