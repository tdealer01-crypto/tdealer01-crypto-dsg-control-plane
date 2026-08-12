import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runInSandbox } from '@/lib/executors/terminal-sandbox';
import { sha256Text } from '@/lib/dsg/runtime/hash';
import type {
  RepairCandidate,
  RepairExecutionResult,
  RepairValidationProfile,
  RepairValidationResult,
  VerifiedRepairRequest,
} from './types';

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_DIFF_BYTES = 1024 * 1024;

type CommandSpec = {
  name: RepairValidationResult['name'];
  command: string;
  args: string[];
  timeoutMs: number;
};

const PROFILE_COMMANDS: Record<RepairValidationProfile, CommandSpec[]> = {
  none: [],
  fast: [
    { name: 'diff', command: 'git', args: ['diff', '--check'], timeoutMs: 30_000 },
    { name: 'typecheck', command: 'npm', args: ['run', 'typecheck'], timeoutMs: 120_000 },
  ],
  full: [
    { name: 'diff', command: 'git', args: ['diff', '--check'], timeoutMs: 30_000 },
    { name: 'typecheck', command: 'npm', args: ['run', 'typecheck'], timeoutMs: 120_000 },
    { name: 'unit', command: 'npm', args: ['run', 'test:unit', '--', '--reporter=dot'], timeoutMs: 300_000 },
    { name: 'build', command: 'npm', args: ['run', 'build'], timeoutMs: 300_000 },
    { name: 'security', command: 'npm', args: ['audit', '--omit=dev', '--audit-level=high', '--json'], timeoutMs: 120_000 },
  ],
};

function safeRepoPath(repoRoot: string, relativePath: string): string {
  const normalized = relativePath.replaceAll('\\', '/');
  if (!normalized || normalized.startsWith('/') || normalized.includes('\u0000')) {
    throw new Error(`INVALID_REPAIR_PATH:${relativePath}`);
  }
  if (normalized.split('/').some((part) => part === '..')) {
    throw new Error(`REPAIR_PATH_TRAVERSAL:${relativePath}`);
  }
  const resolvedRoot = path.resolve(repoRoot);
  const resolved = path.resolve(resolvedRoot, normalized);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`REPAIR_PATH_OUTSIDE_REPOSITORY:${relativePath}`);
  }
  if (/(^|[/\\])(?:\.git|node_modules)(?:[/\\]|$)/i.test(normalized) ||
      /(^|[/\\])\.env(?:\.|$)/i.test(normalized)) {
    throw new Error(`REPAIR_PATH_SENSITIVE:${relativePath}`);
  }
  return resolved;
}

function runSafeCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
) {
  return runInSandbox(command, args, {
    cwd,
    timeoutMs,
    maxOutputBytes: 256 * 1024,
    env: { CI: '1' },
  });
}

function runGit(repoRoot: string, args: string[], timeoutMs = 30_000) {
  const result = runSafeCommand('git', args, repoRoot, timeoutMs);
  if (!result.ok) {
    throw new Error(`GIT_COMMAND_FAILED:${args.join(' ')}:${result.stderr.slice(0, 400)}`);
  }
  return result.stdout.trim();
}

async function applySelectedCandidates(
  worktreePath: string,
  candidates: RepairCandidate[],
): Promise<string[]> {
  const byFile = new Map<string, RepairCandidate[]>();
  for (const candidate of candidates) {
    const list = byFile.get(candidate.file) ?? [];
    list.push(candidate);
    byFile.set(candidate.file, list);
  }

  const changedFiles: string[] = [];
  for (const [relativeFile, fileCandidates] of [...byFile.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const absoluteFile = safeRepoPath(worktreePath, relativeFile);
    const fileStat = await stat(absoluteFile);
    if (fileStat.size > MAX_FILE_BYTES) throw new Error(`REPAIR_FILE_TOO_LARGE:${relativeFile}`);
    const original = await readFile(absoluteFile, 'utf8');
    const replacements = fileCandidates.map((candidate) => {
      if (!candidate.expected) throw new Error(`EMPTY_EXPECTED_TEXT:${candidate.id}`);
      const first = original.indexOf(candidate.expected);
      const last = original.lastIndexOf(candidate.expected);
      if (first < 0) throw new Error(`EXPECTED_TEXT_NOT_FOUND:${candidate.id}`);
      if (first !== last) throw new Error(`EXPECTED_TEXT_NOT_UNIQUE:${candidate.id}`);
      return { candidate, start: first, end: first + candidate.expected.length };
    });

    const ordered = [...replacements].sort((a, b) => b.start - a.start || a.candidate.id.localeCompare(b.candidate.id));
    for (let index = 1; index < ordered.length; index += 1) {
      if (ordered[index - 1].start < ordered[index].end) {
        throw new Error(`OVERLAPPING_REPAIR_CANDIDATES:${relativeFile}`);
      }
    }

    let updated = original;
    for (const replacement of ordered) {
      updated = updated.slice(0, replacement.start) + replacement.candidate.replacement + updated.slice(replacement.end);
    }
    if (updated === original) throw new Error(`NO_EFFECT_REPAIR:${relativeFile}`);
    await writeFile(absoluteFile, updated, 'utf8');
    changedFiles.push(relativeFile);
  }
  return changedFiles;
}

async function runValidationProfile(
  worktreePath: string,
  profile: RepairValidationProfile,
): Promise<RepairValidationResult[]> {
  const results: RepairValidationResult[] = [];
  for (const spec of PROFILE_COMMANDS[profile]) {
    const result = runSafeCommand(spec.command, spec.args, worktreePath, spec.timeoutMs);
    const combined = `${result.stdout}\n${result.stderr}`;
    results.push({
      name: spec.name,
      ok: result.ok,
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      durationMs: result.durationMs,
      outputHash: result.outputHash,
      outputBytes: Buffer.byteLength(combined, 'utf8'),
      summary: result.ok
        ? `${spec.name} passed`
        : `${spec.name} failed${result.timedOut ? ' (timeout)' : ''}: ${result.stderr.slice(0, 240)}`,
    });
    if (!result.ok) break;
  }
  return results;
}

/**
 * Apply a verified plan only to a disposable git worktree, then run a fixed
 * validation profile. The caller receives hashes and status, never a claim
 * that the base branch or production has changed.
 */
export async function executeRepairInWorktree(
  request: VerifiedRepairRequest,
  selectedCandidates: RepairCandidate[],
): Promise<RepairExecutionResult> {
  if (!request.repoRoot) throw new Error('REPOSITORY_CHECKOUT_REQUIRED');

  const repoRoot = path.resolve(request.repoRoot);
  const actualRoot = runGit(repoRoot, ['rev-parse', '--show-toplevel']);
  if (path.resolve(actualRoot) !== repoRoot) throw new Error('REPOSITORY_ROOT_MISMATCH');

  const baseCommit = request.baseCommit
    ? runGit(repoRoot, ['rev-parse', '--verify', `${request.baseCommit}^{commit}`])
    : runGit(repoRoot, ['rev-parse', 'HEAD']);
  const worktreePath = path.join(repoRoot, `.dsg-verified-repair-${randomUUID()}`);
  await mkdir(path.dirname(worktreePath), { recursive: true });

  let worktreeAdded = false;
  let output: RepairExecutionResult;
  try {
    runGit(repoRoot, ['worktree', 'add', '--detach', worktreePath, baseCommit], 60_000);
    worktreeAdded = true;
    const worktreeCommit = runGit(worktreePath, ['rev-parse', 'HEAD']);
    const changedFiles = await applySelectedCandidates(worktreePath, selectedCandidates);
    const diffResult = runInSandbox('git', ['diff', '--no-ext-diff', '--binary', '--'], {
      cwd: worktreePath,
      timeoutMs: 30_000,
      maxOutputBytes: MAX_DIFF_BYTES,
      env: { CI: '1' },
    });
    if (!diffResult.ok) throw new Error(`DIFF_COLLECTION_FAILED:${diffResult.stderr.slice(0, 400)}`);
    const diffBytes = Buffer.byteLength(diffResult.stdout, 'utf8');
    if (diffBytes === 0) throw new Error('EMPTY_REPAIR_DIFF');
    if (diffBytes > MAX_DIFF_BYTES) throw new Error('REPAIR_DIFF_TOO_LARGE');

    const validations = await runValidationProfile(
      worktreePath,
      request.validationProfile ?? 'none',
    );

    output = {
      controlledExecutorUsed: true,
      patchApplied: true,
      baseCommit,
      worktreeCommit,
      changedFiles,
      diffHash: sha256Text(diffResult.stdout),
      diffBytes,
      validations,
      cleanupOk: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    let worktreeCommit = baseCommit;
    if (worktreeAdded) {
      try {
        worktreeCommit = runGit(worktreePath, ['rev-parse', 'HEAD']);
      } catch {
        worktreeCommit = baseCommit;
      }
    }
    output = {
      controlledExecutorUsed: worktreeAdded,
      patchApplied: false,
      baseCommit,
      worktreeCommit,
      changedFiles: [],
      diffHash: sha256Text(''),
      diffBytes: 0,
      validations: [],
      cleanupOk: false,
      error: message,
    };
  } finally {
    let cleanupOk = true;
    if (worktreeAdded) {
      const remove = runSafeCommand('git', ['worktree', 'remove', '--force', worktreePath], repoRoot, 60_000);
      if (!remove.ok) {
        await rm(worktreePath, { recursive: true, force: true }).catch(() => {
          cleanupOk = false;
        });
      }
    } else {
      await rm(worktreePath, { recursive: true, force: true }).catch(() => {
        cleanupOk = false;
      });
    }
    output.cleanupOk = cleanupOk;
  }
  return output;
}
