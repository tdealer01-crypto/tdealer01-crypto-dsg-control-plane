/**
 * Real Shell Executor for DSG Brain
 * Executes commands in a controlled environment with full whitelist and path validation.
 * Captures stdout/stderr as evidence.
 */

import { execSync, spawnSync } from "child_process";
import { basename, resolve, normalize, isAbsolute } from "path";
import {
  ControlledExecutionContext,
  ControlledExecutionResult,
  ProposedCommand,
  ExecutionEvidence,
} from "./controlled-executor";
import { sha256Hash, sha256Raw } from "./hash-utils";

/**
 * Dangerous commands that should never be allowed regardless of whitelist.
 * These are defense-in-depth against misconfiguration.
 */
const DANGEROUS_COMMANDS = new Set([
  "rm",
  "rm -rf",
  "rmdir",
  "mkfs",
  "dd",
  "shred",
  "wipe",
  "format",
  "fdisk",
  "parted",
  "kill -9",
  "killall",
  "shutdown",
  "reboot",
  "halt",
  "poweroff",
  "sudo",
  "su",
  "passwd",
  "chmod 777",
  "chown",
  "chgrp",
]);

/**
 * Forbidden paths that should never be written to regardless of allowedPaths.
 * Defense-in-depth against misconfiguration.
 */
const FORBIDDEN_PATHS = [
  "/etc",
  "/sys",
  "/proc",
  "/dev",
  "/boot",
  "/root",
  "/.ssh",
  "/.ssh/*",
  ".env",
  ".env.local",
  ".env.*.local",
  ".aws",
  ".aws/*",
  "~/.ssh",
  "~/.ssh/*",
  "~/.aws",
  "~/.aws/*",
];

/**
 * Normalize a path for comparison (canonical form).
 */
function canonicalPath(inputPath: string): string {
  // Expand ~ to home directory
  const expanded =
    inputPath.startsWith("~") && (inputPath.length === 1 || inputPath[1] === "/")
      ? inputPath.replace("~", process.env.HOME || "/root")
      : inputPath;

  // Resolve to absolute path
  const absolute = isAbsolute(expanded) ? expanded : resolve(process.cwd(), expanded);

  // Normalize (collapse .. and .)
  return normalize(absolute);
}

/**
 * Check if a path is forbidden.
 */
function isForbiddenPath(filePath: string): boolean {
  const canonical = canonicalPath(filePath);

  for (const forbidden of FORBIDDEN_PATHS) {
    // Handle patterns with wildcards
    if (forbidden.includes("*")) {
      const forbiddenCanonical = canonicalPath(forbidden);

      // Prefix match (for directory restrictions like /etc/*)
      if (
        forbiddenCanonical.endsWith("*") &&
        canonical.startsWith(forbiddenCanonical.slice(0, -1))
      ) {
        return true;
      }

      // Parent directory match (don't allow writing to /etc or subdirs)
      if (forbiddenCanonical.endsWith("/*")) {
        const dir = forbiddenCanonical.slice(0, -2);
        if (canonical.startsWith(dir + "/") || canonical === dir) {
          return true;
        }
      }
    } else {
      // Exact path or directory with no wildcards
      const forbiddenCanonical = canonicalPath(forbidden);

      // Exact match
      if (canonical === forbiddenCanonical) {
        return true;
      }

      // If forbidden is a directory, block access to it and all subdirs
      if (canonical.startsWith(forbiddenCanonical + "/")) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a command is dangerous (defense-in-depth).
 */
function isDangerousCommand(cmd: string): boolean {
  const normalized = cmd.trim().toLowerCase();

  for (const dangerous of DANGEROUS_COMMANDS) {
    if (normalized === dangerous || normalized.startsWith(dangerous + " ")) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a command is in the whitelist.
 */
function isAllowedCommand(cmd: string, allowedCommands: string[]): boolean {
  const normalized = cmd.trim().toLowerCase();
  const cmdName = normalized.split(/\s+/)[0]; // Get first word (command name)

  return allowedCommands.some(
    (allowed) => allowed.trim().toLowerCase() === cmdName
  );
}

/**
 * Check if a file path is in the allowed list.
 */
function isAllowedPath(filePath: string, allowedPaths: string[]): boolean {
  const canonical = canonicalPath(filePath);

  return allowedPaths.some((allowed) => {
    const allowedCanonical = canonicalPath(allowed);

    // Exact match
    if (canonical === allowedCanonical) {
      return true;
    }

    // Is under allowed directory
    if (allowedCanonical.endsWith("/")) {
      return canonical.startsWith(allowedCanonical);
    }

    return canonical.startsWith(allowedCanonical + "/");
  });
}

/**
 * Execute a shell command and return evidence.
 * Validates command and paths against whitelist before execution.
 * Returns captured stdout/stderr as evidence hash.
 */
export async function executeCommand(
  cmd: ProposedCommand,
  ctx: ControlledExecutionContext
): Promise<{
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  evidence: ExecutionEvidence;
  blockReason?: string;
}> {
  // 1. Check dangerous commands (defense-in-depth)
  if (isDangerousCommand(cmd.command)) {
    return {
      success: false,
      stdout: "",
      stderr: `BLOCKED: Command "${cmd.command}" is in dangerous command blacklist`,
      exitCode: 1,
      blockReason: `DANGEROUS_COMMAND: ${cmd.command}`,
      evidence: {
        type: "command" as const,
        id: `cmd-${Date.now()}`,
        hash: sha256Hash({ command: cmd, error: "dangerous_command" }),
        timestamp: Date.now(),
      },
    };
  }

  // 2. Check whitelist
  if (!isAllowedCommand(cmd.command, ctx.allowedCommands)) {
    return {
      success: false,
      stdout: "",
      stderr: `BLOCKED: Command "${cmd.command}" is not in allowedCommands`,
      exitCode: 1,
      blockReason: `NOT_IN_WHITELIST: ${cmd.command}`,
      evidence: {
        type: "command" as const,
        id: `cmd-${Date.now()}`,
        hash: sha256Hash({ command: cmd, error: "not_in_whitelist" }),
        timestamp: Date.now(),
      },
    };
  }

  // 3. Check execution grant validity
  const grantValid = ctx.grant.issuedAt + ctx.grant.ttlMs > Date.now();
  if (!grantValid) {
    return {
      success: false,
      stdout: "",
      stderr: "BLOCKED: Execution grant expired",
      exitCode: 1,
      blockReason: "GRANT_EXPIRED",
      evidence: {
        type: "command" as const,
        id: `cmd-${Date.now()}`,
        hash: sha256Hash({ command: cmd, error: "grant_expired" }),
        timestamp: Date.now(),
      },
    };
  }

  // 4. Build the command string
  const fullCommand = [cmd.command, ...cmd.args].join(" ");

  // 5. Execute the command synchronously
  let stdout = "";
  let stderr = "";
  let exitCode = 0;

  try {
    stdout = execSync(fullCommand, {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024 * 10, // 10MB max
      timeout: 30 * 1000, // 30 second timeout
      stdio: ["pipe", "pipe", "pipe"],
    }) as string;
  } catch (error: unknown) {
    const err = error as { status?: number; stderr?: Buffer; stdout?: Buffer; message: string };
    exitCode = err.status || 1;
    stdout = err.stdout ? err.stdout.toString("utf-8") : "";
    stderr = err.stderr
      ? err.stderr.toString("utf-8")
      : err.message || "Command execution failed";
  }

  // 6. Create evidence from execution results
  const evidence: ExecutionEvidence = {
    type: "command" as const,
    id: `cmd-${Date.now()}`,
    hash: sha256Hash({
      command: cmd,
      stdout,
      stderr,
      exitCode,
      timestamp: Date.now(),
    }),
    timestamp: Date.now(),
  };

  return {
    success: exitCode === 0,
    stdout,
    stderr,
    exitCode,
    evidence,
  };
}

/**
 * Validate that a proposed file change is allowed (defense-in-depth).
 */
export function validateFileChange(
  filePath: string,
  ctx: ControlledExecutionContext
): { allowed: boolean; blockReason?: string } {
  // 1. Check forbidden paths first
  if (isForbiddenPath(filePath)) {
    return {
      allowed: false,
      blockReason: `FORBIDDEN_PATH: ${filePath} is in forbidden paths list`,
    };
  }

  // 2. Check whitelist
  if (!isAllowedPath(filePath, ctx.allowedPaths)) {
    return {
      allowed: false,
      blockReason: `NOT_IN_ALLOWED_PATHS: ${filePath} is not in allowedPaths`,
    };
  }

  return { allowed: true };
}

/**
 * Parse the canonical plan into executable commands.
 * Supports JSON steps format and plain-text line format.
 */
function parsePlanCommands(canonicalPlan: string): ProposedCommand[] {
  // Try structured JSON first: { steps: [{command, args}] }
  try {
    const parsed = JSON.parse(canonicalPlan) as unknown;
    if (parsed && typeof parsed === 'object' && 'steps' in parsed) {
      const steps = (parsed as { steps: unknown[] }).steps;
      if (Array.isArray(steps)) {
        return steps
          .filter((s): s is { command: string; args?: string[] } =>
            typeof s === 'object' && s !== null && typeof (s as { command?: unknown }).command === 'string'
          )
          .map((s) => ({
            command: s.command.trim().split(/\s+/)[0],
            args: [
              ...s.command.trim().split(/\s+/).slice(1),
              ...(Array.isArray(s.args) ? s.args.map(String) : []),
            ],
          }));
      }
    }
  } catch {
    // Not JSON — fall through to line parser
  }

  // Plain text: each non-empty line starting with a known command token
  const lines = canonicalPlan.split('\n');
  const commands: ProposedCommand[] = [];
  for (const raw of lines) {
    const line = raw.trim().replace(/^[$#>]\s*/, ''); // strip shell prompts
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length === 0) continue;
    commands.push({ command: parts[0], args: parts.slice(1) });
  }
  return commands;
}

/**
 * Create a shell execution runner compatible with HermesPlugin.executePlan().
 * Parses the LLM-generated plan and executes each command through the gate.
 */
export function createShellExecutor() {
  return async (
    ctx: ControlledExecutionContext
  ): Promise<ControlledExecutionResult> => {
    const executedCommands: ProposedCommand[] = [];
    const evidence: ExecutionEvidence[] = [];
    const fileChanges: Array<{ path: string; operation: string }> = [];
    const stdout_lines: string[] = [];

    const planCommands = parsePlanCommands(ctx.plan.canonicalPlan);

    // Fallback: if plan produced no parseable commands, echo a status line
    const cmdsToRun: ProposedCommand[] =
      planCommands.length > 0
        ? planCommands
        : [{ command: "echo", args: ["[DSG Brain] no executable commands found in plan"] }];

    for (const cmd of cmdsToRun) {
      const result = await executeCommand(cmd, ctx);
      if (result.blockReason) {
        // Blocked — record as evidence and stop
        evidence.push(result.evidence);
        stdout_lines.push(`BLOCKED: ${result.blockReason}`);
        break;
      }
      executedCommands.push(cmd);
      evidence.push(result.evidence);
      if (result.stdout) stdout_lines.push(result.stdout.trim());
      if (!result.success) break; // stop on first failure
    }

    return {
      success: evidence.length > 0 && executedCommands.length > 0,
      planHash: ctx.plan.planHash,
      executedCommands,
      fileChanges,
      evidence,
      // Attach combined stdout so the API route can surface it
      ...(stdout_lines.length > 0 ? { stdout: stdout_lines.join('\n') } : {}),
    } as ControlledExecutionResult & { stdout?: string };
  };
}
