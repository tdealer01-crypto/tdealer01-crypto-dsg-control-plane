import { execFile } from 'node:child_process';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { kilesa, parami, samadhi, truthBoundary, userBenefitGate, verify } from '../app-builder/agent-runtime/decision-frame';
import { sha256Json } from '../runtime/hash';

const execFileAsync = promisify(execFile);

export type DsgGovernedToolKind = 'shell' | 'file' | 'browser' | 'search' | 'schedule' | 'plan' | 'workflow' | 'api' | 'google_workspace' | 'persistent_compute';
export type DsgGovernedToolAction = 'exec' | 'read' | 'write' | 'append' | 'edit' | 'navigate' | 'scrape' | 'query' | 'create' | 'update' | 'allocate' | 'dry_run';
export type DsgGovernedToolStatus = 'ready' | 'blocked' | 'review';

export type DsgGovernedToolRequest = {
  tool: DsgGovernedToolKind;
  action: DsgGovernedToolAction;
  goal: string;
  args?: Record<string, unknown>;
  evidence?: string[];
  history?: string[];
  sandboxRoot?: string;
};

export type DsgGovernedToolPreparedRequest = {
  ok: boolean;
  status: DsgGovernedToolStatus;
  tool: DsgGovernedToolKind;
  action: DsgGovernedToolAction;
  args: Record<string, unknown>;
  audit: {
    id: string;
    truth: 'runtime_evidence' | 'external_data_pending_verification' | 'internal_state_pending_verification' | 'external_action_review';
    requestHash: string;
  };
  decisionFrame: {
    target: ReturnType<typeof samadhi>;
    verifiedInput: ReturnType<typeof verify<DsgGovernedToolRequest>>;
    risk: ReturnType<typeof kilesa>;
    stats: ReturnType<typeof parami>;
    benefit: ReturnType<typeof userBenefitGate>;
    truthBoundary: ReturnType<typeof truthBoundary>;
  };
  blockedReasons: string[];
  userOutcome: string;
};

export type DsgGovernedToolExecutionResult = {
  ok: boolean;
  prepared: DsgGovernedToolPreparedRequest;
  output?: unknown;
  outputVerification: 'runtime_evidence' | 'blocked_before_execution';
};

const supportedActions: Record<DsgGovernedToolKind, DsgGovernedToolAction[]> = {
  shell: ['exec'],
  file: ['read', 'write', 'append', 'edit'],
  browser: ['navigate', 'scrape', 'dry_run'],
  search: ['query', 'dry_run'],
  schedule: ['create', 'dry_run'],
  plan: ['create', 'update', 'dry_run'],
  workflow: ['create', 'update', 'dry_run'],
  api: ['dry_run'],
  google_workspace: ['dry_run'],
  persistent_compute: ['allocate', 'dry_run'],
};

const shellAllowlist = new Set(['pwd', 'node', 'npm', 'npx', 'rg', 'cat', 'sed', 'git']);
const shellDenyPattern = /(?:^|\s)(?:rm|sudo|su|chmod|chown|curl|wget|ssh|scp|dd|mkfs|mount|umount|docker|kubectl|vercel|firebase|supabase)(?:\s|$)|[;&|`$<>]/i;
const sensitivePathPattern = /(?:^|\/)(?:\.env|\.git|node_modules)(?:\/|$)|(?:id_rsa|private[_-]?key|service[_-]?role)/i;

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function splitCommand(command: string): { bin: string; args: string[] } {
  const parts = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map((part) => part.replace(/^['"]|['"]$/g, '')) ?? [];
  return { bin: parts[0] || '', args: parts.slice(1) };
}

function pathInsideSandbox(sandboxRoot: string, targetPath: string): { ok: boolean; absolutePath: string; reason?: string } {
  const root = path.resolve(sandboxRoot || process.cwd());
  const absolutePath = path.resolve(root, targetPath);
  if (!absolutePath.startsWith(root + path.sep) && absolutePath !== root) return { ok: false, absolutePath, reason: 'PATH_OUTSIDE_SANDBOX' };
  if (sensitivePathPattern.test(path.relative(root, absolutePath))) return { ok: false, absolutePath, reason: 'SENSITIVE_PATH_BLOCKED' };
  return { ok: true, absolutePath };
}

function blockedReasonsFor(input: DsgGovernedToolRequest): string[] {
  const args = input.args ?? {};
  const reasons: string[] = [];
  if (!input.goal.trim()) reasons.push('GOAL_REQUIRED');
  if (!supportedActions[input.tool]?.includes(input.action)) reasons.push(`ACTION_UNSUPPORTED:${input.tool}:${input.action}`);

  if (input.tool === 'shell') {
    const command = asString(args.command);
    const { bin } = splitCommand(command);
    if (!command) reasons.push('SHELL_COMMAND_REQUIRED');
    if (command && (!shellAllowlist.has(bin) || shellDenyPattern.test(command))) reasons.push('SHELL_COMMAND_NOT_ALLOWLISTED');
  }

  if (input.tool === 'file') {
    const filePath = asString(args.path);
    if (!filePath) reasons.push('FILE_PATH_REQUIRED');
    const checked = pathInsideSandbox(String(input.sandboxRoot || process.cwd()), filePath || '.');
    if (!checked.ok && checked.reason) reasons.push(checked.reason);
    if (['write', 'append', 'edit'].includes(input.action) && typeof args.content !== 'string') reasons.push('FILE_CONTENT_REQUIRED');
  }

  if (input.tool === 'browser') {
    const url = asString(args.url);
    if (!url) reasons.push('BROWSER_URL_REQUIRED');
    if (url && !/^https:\/\//i.test(url)) reasons.push('BROWSER_HTTPS_REQUIRED');
    if (input.action !== 'dry_run') reasons.push('BROWSER_CONFIRMATION_REQUIRED');
  }

  if (input.tool === 'search') {
    if (!asString(args.query)) reasons.push('SEARCH_QUERY_REQUIRED');
  }

  if (input.tool === 'schedule') {
    if (!asString(args.cron) && typeof args.intervalMs !== 'number') reasons.push('SCHEDULE_CRON_OR_INTERVAL_REQUIRED');
    if (input.action !== 'dry_run') reasons.push('SCHEDULE_PERSISTENCE_BACKEND_REQUIRED');
  }

  if (['api', 'google_workspace', 'persistent_compute'].includes(input.tool) && input.action !== 'dry_run') {
    reasons.push('EXTERNAL_ACTION_ADAPTER_NOT_CONFIGURED');
  }

  return reasons;
}

function truthFor(tool: DsgGovernedToolKind): DsgGovernedToolPreparedRequest['audit']['truth'] {
  if (tool === 'shell' || tool === 'file') return 'runtime_evidence';
  if (tool === 'plan' || tool === 'workflow') return 'internal_state_pending_verification';
  if (tool === 'browser' || tool === 'search') return 'external_data_pending_verification';
  return 'external_action_review';
}

export function prepareGovernedToolRequest(input: DsgGovernedToolRequest): DsgGovernedToolPreparedRequest {
  const normalized: DsgGovernedToolRequest = {
    ...input,
    goal: input.goal.trim(),
    args: input.args ?? {},
    evidence: input.evidence ?? [],
    history: input.history ?? [],
    sandboxRoot: input.sandboxRoot || process.cwd(),
  };
  const evidence = [
    ...normalized.evidence!,
    normalized.goal ? `goal_hash:${sha256Json({ goal: normalized.goal })}` : '',
    `args_hash:${sha256Json(normalized.args ?? {})}`,
  ].filter(Boolean);
  const verifiedInput = verify(normalized, evidence);
  const reasons = blockedReasonsFor(normalized);
  const riskFlags = reasons.filter((reason) => /BLOCKED|NOT_ALLOWLISTED|OUTSIDE|SENSITIVE|CONFIRMATION|EXTERNAL_ACTION/.test(reason));
  const risk = kilesa(`${normalized.tool}:${normalized.action}:${normalized.goal || 'missing-goal'}`, verifiedInput.verified && reasons.length === 0, riskFlags);
  const boundary = truthBoundary({ verified: verifiedInput.verified && reasons.length === 0, containsSecret: false });
  const blockedReasons = [...new Set([...reasons, ...risk.reasons.filter((reason) => reason !== 'VERIFIED'), ...boundary.blockedReasons])];
  const reviewOnly = ['browser', 'search', 'schedule', 'plan', 'workflow', 'api', 'google_workspace', 'persistent_compute'].includes(normalized.tool);
  const requestHash = sha256Json({ tool: normalized.tool, action: normalized.action, args: normalized.args, evidence });

  return {
    ok: blockedReasons.length === 0,
    status: blockedReasons.length ? 'blocked' : reviewOnly ? 'review' : 'ready',
    tool: normalized.tool,
    action: normalized.action,
    args: normalized.args ?? {},
    audit: { id: `tool:${requestHash}`, truth: truthFor(normalized.tool), requestHash },
    decisionFrame: {
      target: samadhi(`dsg-tool:${normalized.tool}`, normalized.goal || 'missing-goal'),
      verifiedInput,
      risk,
      stats: parami([...(normalized.history ?? []), normalized.tool, normalized.action]),
      benefit: userBenefitGate({
        userBenefit: 'User gets a governed tool request with fail-closed safety checks before runtime or external action.',
        easier: true,
        tangibleOutput: 'Deterministic audit hash, blocked reasons, and truth boundary for the requested tool action.',
        nextAction: blockedReasons.length ? 'Resolve blocked reasons or request explicit external approval.' : 'Execute only ready shell/file actions or keep review-only actions as plans.',
      }),
      truthBoundary: boundary,
    },
    blockedReasons,
    userOutcome: 'Tooling is governed by target lock, evidence hash, risk checks, and a truth label before execution.',
  };
}

export async function executeGovernedToolRequest(input: DsgGovernedToolRequest): Promise<DsgGovernedToolExecutionResult> {
  const prepared = prepareGovernedToolRequest(input);
  if (!prepared.ok || prepared.status !== 'ready') return { ok: false, prepared, outputVerification: 'blocked_before_execution' };

  if (prepared.tool === 'shell') {
    const { bin, args } = splitCommand(asString(prepared.args.command));
    const { stdout, stderr } = await execFileAsync(bin, args, { cwd: input.sandboxRoot || process.cwd(), timeout: Number(prepared.args.timeoutMs ?? 10_000), maxBuffer: 1024 * 1024 });
    return { ok: true, prepared, output: { stdout, stderr }, outputVerification: 'runtime_evidence' };
  }

  if (prepared.tool === 'file') {
    const checked = pathInsideSandbox(String(input.sandboxRoot || process.cwd()), asString(prepared.args.path));
    if (!checked.ok) return { ok: false, prepared, outputVerification: 'blocked_before_execution' };
    if (prepared.action === 'read') {
      const content = await readFile(checked.absolutePath, 'utf8');
      return { ok: true, prepared, output: { path: prepared.args.path, content, contentHash: sha256Json({ content }) }, outputVerification: 'runtime_evidence' };
    }
    await mkdir(path.dirname(checked.absolutePath), { recursive: true });
    if (prepared.action === 'append') await appendFile(checked.absolutePath, String(prepared.args.content), 'utf8');
    else await writeFile(checked.absolutePath, String(prepared.args.content), 'utf8');
    return { ok: true, prepared, output: { path: prepared.args.path, contentHash: sha256Json({ content: prepared.args.content }) }, outputVerification: 'runtime_evidence' };
  }

  return { ok: false, prepared, outputVerification: 'blocked_before_execution' };
}
