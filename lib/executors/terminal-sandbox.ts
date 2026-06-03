import { spawnSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createHash } from 'crypto';

export interface TerminalSandboxOptions {
  /** Working directory override — defaults to a fresh temp dir per execution */
  cwd?: string;
  /** Environment variables to inject (no secrets, no network tokens) */
  env?: Record<string, string>;
  /** Timeout in ms — default 15 seconds */
  timeoutMs?: number;
  /** Maximum stdout/stderr bytes to capture — default 64 KB */
  maxOutputBytes?: number;
}

export interface TerminalSandboxResult {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  /** SHA-256 of stdout for evidence binding */
  outputHash: string;
  durationMs: number;
}

const SAFE_COMMANDS = new Set([
  'ls', 'cat', 'echo', 'pwd', 'env', 'printenv',
  'node', 'npm', 'npx', 'python', 'python3',
  'git', 'grep', 'find', 'sort', 'uniq', 'wc',
  'curl', 'wget', 'jq', 'yq', 'sed', 'awk',
  'tsc', 'jest', 'vitest', 'eslint',
]);

const FORBIDDEN_COMMANDS = new Set([
  'rm', 'rmdir', 'dd', 'mkfs', 'shred', 'wipe', 'format', 'fdisk',
  'sudo', 'su', 'passwd', 'chmod', 'chown', 'chgrp',
  'kill', 'killall', 'shutdown', 'reboot', 'halt', 'poweroff',
  'ssh', 'scp', 'sftp', 'telnet', 'nc', 'netcat',
  'curl -X DELETE', 'curl --request DELETE',
]);

export function validateCommand(command: string): { ok: boolean; reason?: string } {
  const parts = command.trim().split(/\s+/);
  const base = parts[0];

  if (!base) return { ok: false, reason: 'empty_command' };

  if (FORBIDDEN_COMMANDS.has(base) || FORBIDDEN_COMMANDS.has(command.slice(0, 30))) {
    return { ok: false, reason: `forbidden_command:${base}` };
  }

  if (!SAFE_COMMANDS.has(base) && !base.startsWith('./') && !base.startsWith('/tmp/')) {
    return { ok: false, reason: `command_not_in_safe_list:${base}` };
  }

  if (command.includes('&&') || command.includes('||') || command.includes(';') || command.includes('|')) {
    return { ok: false, reason: 'chained_commands_not_allowed' };
  }

  if (command.includes('$(') || command.includes('`')) {
    return { ok: false, reason: 'command_substitution_not_allowed' };
  }

  return { ok: true };
}

export function runInSandbox(
  command: string,
  args: string[] = [],
  opts: TerminalSandboxOptions = {},
): TerminalSandboxResult {
  const { timeoutMs = 15_000, maxOutputBytes = 64 * 1024 } = opts;
  const start = Date.now();

  const valid = validateCommand(command);
  if (!valid.ok) {
    return {
      ok: false,
      exitCode: null,
      stdout: '',
      stderr: `sandbox_rejected: ${valid.reason}`,
      timedOut: false,
      outputHash: sha256(''),
      durationMs: 0,
    };
  }

  let cwd = opts.cwd;
  let tempDir: string | null = null;
  if (!cwd) {
    tempDir = mkdtempSync(join(tmpdir(), 'dsg-sandbox-'));
    cwd = tempDir;
  }

  const safeEnv: Record<string, string> = {
    PATH: '/usr/local/bin:/usr/bin:/bin:/usr/local/sbin',
    HOME: cwd,
    TMPDIR: cwd,
    ...Object.fromEntries(
      Object.entries(opts.env ?? {}).filter(
        ([k]) => !k.includes('SECRET') && !k.includes('KEY') && !k.includes('TOKEN') && !k.includes('PASSWORD'),
      ),
    ),
  };

  try {
    const result = spawnSync(command, args, {
      cwd,
      env: safeEnv as NodeJS.ProcessEnv,
      timeout: timeoutMs,
      maxBuffer: maxOutputBytes,
      encoding: 'utf8',
    });

    const stdout = String(result.stdout ?? '').slice(0, maxOutputBytes);
    const stderr = String(result.stderr ?? '').slice(0, maxOutputBytes);
    const timedOut = result.signal === 'SIGTERM';

    return {
      ok: result.status === 0 && !timedOut,
      exitCode: result.status,
      stdout,
      stderr,
      timedOut,
      outputHash: sha256(stdout),
      durationMs: Date.now() - start,
    };
  } finally {
    if (tempDir) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  }
}

function sha256(value: string): string {
  return 'sha256:' + createHash('sha256').update(value, 'utf8').digest('hex');
}
