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

type StoredRecord = {
  id: string;
  tool: DsgGovernedToolKind;
  action: DsgGovernedToolAction;
  goal: string;
  args: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  requestHash: string;
  evidenceHash: string;
  status: 'created' | 'updated' | 'allocated';
};

const supportedActions: Record<DsgGovernedToolKind, DsgGovernedToolAction[]> = {
  shell: ['exec'],
  file: ['read', 'write', 'append', 'edit'],
  browser: ['navigate', 'scrape', 'dry_run'],
  search: ['query', 'dry_run'],
  schedule: ['create', 'dry_run'],
  plan: ['create', 'update', 'dry_run'],
  workflow: ['create', 'update', 'dry_run'],
  api: ['query', 'create', 'update', 'dry_run'],
  google_workspace: ['query', 'create', 'update', 'dry_run'],
  persistent_compute: ['allocate', 'dry_run'],
};

const shellAllowlist = new Set(['pwd', 'node', 'npm', 'npx', 'rg', 'cat', 'sed', 'git']);
const shellDenyPattern = /(?:^|\s)(?:rm|sudo|su|chmod|chown|curl|wget|ssh|scp|dd|mkfs|mount|umount|docker|kubectl|vercel|firebase|supabase)(?:\s|$)|[;&|`$<>]/i;
const sensitivePathPattern = /(?:^|\/)(?:\.env|\.git|node_modules)(?:\/|$)|(?:id_rsa|private[_-]?key|service[_-]?role)/i;
const privateHostnamePattern = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1$|fc00:|fd00:)/i;
const externalToolKinds = new Set<DsgGovernedToolKind>(['browser', 'search', 'api', 'google_workspace']);
const persistedToolKinds = new Set<DsgGovernedToolKind>(['schedule', 'plan', 'workflow', 'persistent_compute']);

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 'true';
}

function splitCommand(command: string): { bin: string; args: string[] } {
  const parts = command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map((part) => part.replace(/^["']|["']$/g, '')) ?? [];
  return { bin: parts[0] || '', args: parts.slice(1) };
}

function pathInsideSandbox(sandboxRoot: string, targetPath: string): { ok: boolean; absolutePath: string; reason?: string } {
  const root = path.resolve(sandboxRoot || process.cwd());
  const absolutePath = path.resolve(root, targetPath);
  if (!absolutePath.startsWith(root + path.sep) && absolutePath !== root) return { ok: false, absolutePath, reason: 'PATH_OUTSIDE_SANDBOX' };
  if (sensitivePathPattern.test(path.relative(root, absolutePath))) return { ok: false, absolutePath, reason: 'SENSITIVE_PATH_BLOCKED' };
  return { ok: true, absolutePath };
}

function parseHttpsUrl(value: unknown): { ok: boolean; url?: URL; reason?: string } {
  const raw = asString(value);
  if (!raw) return { ok: false, reason: 'URL_REQUIRED' };
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return { ok: false, reason: 'HTTPS_REQUIRED' };
    if (privateHostnamePattern.test(url.hostname)) return { ok: false, reason: 'PRIVATE_HOST_BLOCKED' };
    return { ok: true, url };
  } catch {
    return { ok: false, reason: 'URL_INVALID' };
  }
}

function isAllowedHost(url: URL, allowedHosts: unknown): boolean {
  if (!Array.isArray(allowedHosts) || allowedHosts.length === 0) return true;
  return allowedHosts.map((host) => String(host).trim().toLowerCase()).filter(Boolean).includes(url.hostname.toLowerCase());
}

function persistenceRoot(sandboxRoot: string): string {
  return path.join(path.resolve(sandboxRoot || process.cwd()), '.dsg-governed-tools');
}

function persistenceFile(sandboxRoot: string, tool: DsgGovernedToolKind): string {
  return path.join(persistenceRoot(sandboxRoot), `${tool}.jsonl`);
}

function recordId(tool: DsgGovernedToolKind, action: DsgGovernedToolAction, args: Record<string, unknown>): string {
  return `${tool}:${sha256Json({ action, args }).slice(0, 24)}`;
}

function textFromHtml(html: string): { title: string; text: string } {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const text = withoutScripts.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
  return { title: title.replace(/\s+/g, ' ').trim(), text };
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
    const parsed = parseHttpsUrl(args.url);
    if (!parsed.ok) reasons.push(`BROWSER_${parsed.reason}`);
    else if (!isAllowedHost(parsed.url!, args.allowedHosts)) reasons.push('BROWSER_HOST_NOT_ALLOWLISTED');
    if (input.action !== 'dry_run' && !asBoolean(args.approved)) reasons.push('BROWSER_CONFIRMATION_REQUIRED');
  }

  if (input.tool === 'search') {
    if (!asString(args.query)) reasons.push('SEARCH_QUERY_REQUIRED');
    const endpoint = parseHttpsUrl(args.endpoint ?? process.env.DSG_SEARCH_ENDPOINT);
    if (input.action !== 'dry_run' && !endpoint.ok) reasons.push(`SEARCH_ENDPOINT_${endpoint.reason}`);
    if (endpoint.ok && !isAllowedHost(endpoint.url!, args.allowedHosts)) reasons.push('SEARCH_ENDPOINT_HOST_NOT_ALLOWLISTED');
    if (input.action !== 'dry_run' && !asBoolean(args.approved)) reasons.push('SEARCH_CONFIRMATION_REQUIRED');
  }

  if (input.tool === 'schedule') {
    if (!asString(args.cron) && typeof args.intervalMs !== 'number') reasons.push('SCHEDULE_CRON_OR_INTERVAL_REQUIRED');
    if (typeof args.intervalMs === 'number' && args.intervalMs < 60_000) reasons.push('SCHEDULE_INTERVAL_TOO_SHORT');
  }

  if (input.tool === 'plan' || input.tool === 'workflow') {
    if (input.action === 'create' && !asString(args.title)) reasons.push(`${input.tool.toUpperCase()}_TITLE_REQUIRED`);
    if (input.action === 'update' && !asString(args.id)) reasons.push(`${input.tool.toUpperCase()}_ID_REQUIRED`);
  }

  if (input.tool === 'persistent_compute') {
    if (!asString(args.name)) reasons.push('PERSISTENT_COMPUTE_NAME_REQUIRED');
    if (typeof args.ttlMs === 'number' && (args.ttlMs < 60_000 || args.ttlMs > 86_400_000)) reasons.push('PERSISTENT_COMPUTE_TTL_OUT_OF_RANGE');
  }

  if (input.tool === 'api') {
    const parsed = parseHttpsUrl(args.url);
    if (input.action !== 'dry_run' && !parsed.ok) reasons.push(`API_${parsed.reason}`);
    if (parsed.ok && !isAllowedHost(parsed.url!, args.allowedHosts)) reasons.push('API_HOST_NOT_ALLOWLISTED');
    const method = asString(args.method || (input.action === 'query' ? 'GET' : 'POST')).toUpperCase();
    if (!['GET', 'POST', 'PUT', 'PATCH'].includes(method)) reasons.push('API_METHOD_NOT_ALLOWLISTED');
    if (input.action !== 'dry_run' && !asBoolean(args.approved)) reasons.push('API_CONFIRMATION_REQUIRED');
  }

  if (input.tool === 'google_workspace') {
    const operation = asString(args.operation);
    if (!operation) reasons.push('GOOGLE_WORKSPACE_OPERATION_REQUIRED');
    if (input.action !== 'dry_run' && !['drive.search', 'docs.create', 'sheets.append'].includes(operation)) reasons.push('GOOGLE_WORKSPACE_OPERATION_NOT_ALLOWLISTED');
    const endpoint = parseHttpsUrl(args.endpoint ?? process.env.DSG_GOOGLE_WORKSPACE_ENDPOINT);
    if (input.action !== 'dry_run' && !endpoint.ok) reasons.push(`GOOGLE_WORKSPACE_ENDPOINT_${endpoint.reason}`);
    if (endpoint.ok && !isAllowedHost(endpoint.url!, args.allowedHosts)) reasons.push('GOOGLE_WORKSPACE_ENDPOINT_HOST_NOT_ALLOWLISTED');
    if (input.action !== 'dry_run' && !asBoolean(args.approved)) reasons.push('GOOGLE_WORKSPACE_CONFIRMATION_REQUIRED');
  }

  return reasons;
}

function truthFor(tool: DsgGovernedToolKind): DsgGovernedToolPreparedRequest['audit']['truth'] {
  if (tool === 'shell' || tool === 'file') return 'runtime_evidence';
  if (tool === 'plan' || tool === 'workflow' || tool === 'schedule' || tool === 'persistent_compute') return 'internal_state_pending_verification';
  if (tool === 'browser' || tool === 'search') return 'external_data_pending_verification';
  return 'external_action_review';
}

function readyStatus(tool: DsgGovernedToolKind, action: DsgGovernedToolAction): DsgGovernedToolStatus {
  if (action === 'dry_run') return 'review';
  if (tool === 'shell' || tool === 'file' || persistedToolKinds.has(tool) || externalToolKinds.has(tool)) return 'ready';
  return 'review';
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
  const riskFlags = reasons.filter((reason) => /BLOCKED|NOT_ALLOWLISTED|OUTSIDE|SENSITIVE|CONFIRMATION|EXTERNAL_ACTION|ENDPOINT|PRIVATE|INVALID|TOO_SHORT|OUT_OF_RANGE/.test(reason));
  const risk = kilesa(`${normalized.tool}:${normalized.action}:${normalized.goal || 'missing-goal'}`, verifiedInput.verified && reasons.length === 0, riskFlags);
  const boundary = truthBoundary({ verified: verifiedInput.verified && reasons.length === 0, containsSecret: false });
  const blockedReasons = [...new Set([...reasons, ...risk.reasons.filter((reason) => reason !== 'VERIFIED'), ...boundary.blockedReasons])];
  const requestHash = sha256Json({ tool: normalized.tool, action: normalized.action, args: normalized.args, evidence });

  return {
    ok: blockedReasons.length === 0,
    status: blockedReasons.length ? 'blocked' : readyStatus(normalized.tool, normalized.action),
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
        userBenefit: 'User gets a governed tool request with fail-closed safety checks before runtime, persistence, or external action.',
        easier: true,
        tangibleOutput: 'Deterministic audit hash, blocked reasons, truth boundary, and adapter output for the requested tool action.',
        nextAction: blockedReasons.length ? 'Resolve blocked reasons or provide explicit approval and allowlisted endpoints.' : 'Execute the ready adapter or inspect the dry-run review output.',
      }),
      truthBoundary: boundary,
    },
    blockedReasons,
    userOutcome: 'Tooling is governed by target lock, evidence hash, risk checks, and a truth label before execution.',
  };
}

async function executeBrowser(prepared: DsgGovernedToolPreparedRequest): Promise<unknown> {
  const url = parseHttpsUrl(prepared.args.url).url!;
  const response = await fetch(url, { headers: { accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8', 'user-agent': 'DSG-ONE-Governed-Tools/1.0' } });
  const contentType = response.headers.get('content-type') ?? '';
  const body = (await response.text()).slice(0, Number(prepared.args.maxBytes ?? 250_000));
  const extracted = contentType.includes('html') ? textFromHtml(body) : { title: '', text: body.replace(/\s+/g, ' ').trim() };
  const textLimit = Number(prepared.args.textLimit ?? (prepared.action === 'scrape' ? 12_000 : 2_000));
  return { url: url.toString(), status: response.status, ok: response.ok, contentType, title: extracted.title, text: extracted.text.slice(0, textLimit), contentHash: sha256Json({ body }) };
}

async function executeSearch(prepared: DsgGovernedToolPreparedRequest): Promise<unknown> {
  const endpoint = parseHttpsUrl(prepared.args.endpoint ?? process.env.DSG_SEARCH_ENDPOINT).url!;
  endpoint.searchParams.set('q', asString(prepared.args.query));
  const response = await fetch(endpoint, { headers: { accept: 'application/json,text/plain;q=0.8', 'user-agent': 'DSG-ONE-Governed-Tools/1.0' } });
  const raw = (await response.text()).slice(0, Number(prepared.args.maxBytes ?? 250_000));
  let parsed: unknown = raw;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { text: raw.slice(0, Number(prepared.args.textLimit ?? 4_000)) };
  }
  return { endpoint: endpoint.toString(), status: response.status, ok: response.ok, results: parsed, resultHash: sha256Json({ raw }) };
}

async function persistRecord(input: DsgGovernedToolRequest, prepared: DsgGovernedToolPreparedRequest): Promise<StoredRecord> {
  const root = String(input.sandboxRoot || process.cwd());
  const now = new Date().toISOString();
  const status = prepared.tool === 'persistent_compute' ? 'allocated' : prepared.action === 'update' ? 'updated' : 'created';
  const record: StoredRecord = {
    id: asString(prepared.args.id) || recordId(prepared.tool, prepared.action, prepared.args),
    tool: prepared.tool,
    action: prepared.action,
    goal: input.goal.trim(),
    args: prepared.args,
    createdAt: now,
    updatedAt: now,
    requestHash: prepared.audit.requestHash,
    evidenceHash: sha256Json({ truth: prepared.audit.truth, args: prepared.args, goal: input.goal }),
    status,
  };
  await mkdir(persistenceRoot(root), { recursive: true });
  await appendFile(persistenceFile(root, prepared.tool), `${JSON.stringify(record)}\n`, 'utf8');
  return record;
}

async function executeApi(prepared: DsgGovernedToolPreparedRequest): Promise<unknown> {
  const url = parseHttpsUrl(prepared.args.url).url!;
  const method = asString(prepared.args.method || (prepared.action === 'query' ? 'GET' : 'POST')).toUpperCase();
  const body = method === 'GET' ? undefined : JSON.stringify(prepared.args.body ?? {});
  const response = await fetch(url, { method, headers: { accept: 'application/json,text/plain;q=0.8', 'content-type': 'application/json' }, body });
  const raw = (await response.text()).slice(0, Number(prepared.args.maxBytes ?? 250_000));
  let parsed: unknown = raw;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { text: raw.slice(0, Number(prepared.args.textLimit ?? 4_000)) };
  }
  return { url: url.toString(), method, status: response.status, ok: response.ok, body: parsed, bodyHash: sha256Json({ raw }) };
}

async function executeGoogleWorkspace(prepared: DsgGovernedToolPreparedRequest): Promise<unknown> {
  const endpoint = parseHttpsUrl(prepared.args.endpoint ?? process.env.DSG_GOOGLE_WORKSPACE_ENDPOINT).url!;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { accept: 'application/json,text/plain;q=0.8', 'content-type': 'application/json' },
    body: JSON.stringify({ operation: prepared.args.operation, payload: prepared.args.payload ?? {} }),
  });
  const raw = (await response.text()).slice(0, Number(prepared.args.maxBytes ?? 250_000));
  let parsed: unknown = raw;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { text: raw.slice(0, Number(prepared.args.textLimit ?? 4_000)) };
  }
  return { operation: prepared.args.operation, status: response.status, ok: response.ok, body: parsed, bodyHash: sha256Json({ raw }) };
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

  if (prepared.tool === 'browser') return { ok: true, prepared, output: await executeBrowser(prepared), outputVerification: 'runtime_evidence' };
  if (prepared.tool === 'search') return { ok: true, prepared, output: await executeSearch(prepared), outputVerification: 'runtime_evidence' };
  if (persistedToolKinds.has(prepared.tool)) return { ok: true, prepared, output: await persistRecord(input, prepared), outputVerification: 'runtime_evidence' };
  if (prepared.tool === 'api') return { ok: true, prepared, output: await executeApi(prepared), outputVerification: 'runtime_evidence' };
  if (prepared.tool === 'google_workspace') return { ok: true, prepared, output: await executeGoogleWorkspace(prepared), outputVerification: 'runtime_evidence' };

  return { ok: false, prepared, outputVerification: 'blocked_before_execution' };
}
