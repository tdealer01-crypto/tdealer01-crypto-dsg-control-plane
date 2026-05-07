import { execFile } from 'node:child_process';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { kilesa, parami, samadhi, truthBoundary, userBenefitGate, verify } from '../app-builder/agent-runtime/decision-frame';
import { sha256Json } from '../runtime/hash';

const execFileAsync = promisify(execFile);

export type DsgGovernedToolKind = 'shell' | 'file' | 'browser' | 'search' | 'schedule' | 'plan' | 'workflow' | 'api' | 'google_workspace' | 'persistent_compute';
export type DsgGovernedToolAction = 'exec' | 'read' | 'write' | 'append' | 'edit' | 'navigate' | 'scrape' | 'query' | 'create' | 'update' | 'delete' | 'allocate' | 'deallocate' | 'dry_run';
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

export type DsgExecutionDecisionFrame = {
  ok: boolean;
  phase: 'preflight' | 'adapter_execution' | 'output_verification';
  target: ReturnType<typeof samadhi>;
  verifiedInput: ReturnType<typeof verify<Record<string, unknown>>>;
  risk: ReturnType<typeof kilesa>;
  stats: ReturnType<typeof parami>;
  benefit: ReturnType<typeof userBenefitGate>;
  truthBoundary: ReturnType<typeof truthBoundary>;
  blockedReasons: string[];
  evidenceHash: string;
};

export type DsgGovernedToolExecutionResult = {
  ok: boolean;
  prepared: DsgGovernedToolPreparedRequest;
  output?: unknown;
  outputVerification: 'runtime_evidence' | 'blocked_before_execution';
  executionDecisionFrame?: DsgExecutionDecisionFrame;
};

export type StoredRecord = {
  id: string;
  tool: DsgGovernedToolKind;
  action: DsgGovernedToolAction;
  goal: string;
  args: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  requestHash: string;
  evidenceHash: string;
  eventHash: string;
  previousEventHash?: string;
  revision: number;
  status: 'created' | 'updated' | 'deleted' | 'allocated' | 'deallocated' | 'read';
  state: Record<string, unknown>;
};

const supportedActions: Record<DsgGovernedToolKind, DsgGovernedToolAction[]> = {
  shell: ['exec'],
  file: ['read', 'write', 'append', 'edit'],
  browser: ['navigate', 'scrape', 'dry_run'],
  search: ['query', 'dry_run'],
  schedule: ['create', 'read', 'update', 'delete', 'dry_run'],
  plan: ['create', 'read', 'update', 'delete', 'dry_run'],
  workflow: ['create', 'read', 'update', 'delete', 'dry_run'],
  api: ['query', 'create', 'update', 'dry_run'],
  google_workspace: ['query', 'create', 'update', 'dry_run'],
  persistent_compute: ['allocate', 'read', 'deallocate', 'dry_run'],
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isValidCronExpression(value: unknown): boolean {
  const cron = asString(value);
  if (!cron) return false;
  const fields = cron.split(/\s+/);
  if (![5, 6].includes(fields.length)) return false;
  return fields.every((field) => /^[\d*/?,\-LW#]+$/i.test(field));
}

function isValidIsoDate(value: unknown): boolean {
  const raw = asString(value);
  return Boolean(raw && !Number.isNaN(Date.parse(raw)));
}

function activeStoredRecords(records: StoredRecord[]): StoredRecord[] {
  const latest = new Map<string, StoredRecord>();
  for (const record of records) latest.set(record.id, record);
  return [...latest.values()].filter((record) => !['deleted', 'deallocated'].includes(record.status));
}

export type AdapterStepTrace = {
  step: string;
  target: ReturnType<typeof samadhi>;
  verified: ReturnType<typeof verify<Record<string, unknown>>>;
  risk: ReturnType<typeof kilesa>;
  stats: ReturnType<typeof parami>;
  truthBoundary: ReturnType<typeof truthBoundary>;
  evidenceHash: string;
  blockedReasons: string[];
};

function buildAdapterStepTrace(prepared: DsgGovernedToolPreparedRequest, step: string, data: Record<string, unknown>, evidence: string[], riskFlags: string[] = []): AdapterStepTrace {
  const stepEvidence = [prepared.audit.requestHash, prepared.audit.id, `adapter:${prepared.tool}`, `action:${prepared.action}`, `step:${step}`, ...evidence].filter(Boolean);
  const target = samadhi(`adapter:${prepared.tool}:${step}`, `${prepared.action}:${asString(data.goal) || prepared.audit.id}`);
  const verified = verify(data, stepEvidence);
  const blockedReasons = [...riskFlags];
  if (!verified.verified) blockedReasons.push('ADAPTER_STEP_EVIDENCE_REQUIRED');
  const risk = kilesa(`${prepared.tool}:${prepared.action}:${step}`, verified.verified && blockedReasons.length === 0, blockedReasons);
  const boundary = truthBoundary({ verified: verified.verified && blockedReasons.length === 0, containsSecret: false });
  const finalBlockedReasons = [...new Set([...blockedReasons, ...risk.reasons.filter((reason) => reason !== 'VERIFIED'), ...boundary.blockedReasons])];
  return {
    step,
    target,
    verified,
    risk,
    stats: parami([prepared.tool, prepared.action, step]),
    truthBoundary: boundary,
    evidenceHash: sha256Json({ stepEvidence, data }),
    blockedReasons: finalBlockedReasons,
  };
}

export function assertAdapterStep(trace: AdapterStepTrace): void {
  if (trace.blockedReasons.length > 0 || trace.risk.state !== 'data_verified' || !trace.truthBoundary.ok) {
    throw new Error(`ADAPTER_STEP_BLOCKED:${trace.step}:${trace.blockedReasons.join(',') || trace.risk.state}`);
  }
}

function adapterErrorBlockedReasons(error: unknown): string[] {
  const message = error instanceof Error ? error.message : String(error || 'UNKNOWN_ADAPTER_ERROR');
  if (message.startsWith('ADAPTER_STEP_BLOCKED:')) return message.split(':').slice(2).join(':').split(',').filter(Boolean);
  return ['ADAPTER_EXECUTION_FAILED'];
}

function persistenceRoot(sandboxRoot: string): string {
  return path.join(path.resolve(sandboxRoot || process.cwd()), '.dsg-governed-tools');
}

function persistenceFile(sandboxRoot: string, tool: DsgGovernedToolKind): string {
  return path.join(persistenceRoot(sandboxRoot), `${tool}.jsonl`);
}


type SchedulerRuntimeEntry = {
  id: string;
  kind: 'cron' | 'interval' | 'one_shot';
  cron?: string;
  intervalMs?: number;
  nextRunAt?: string;
  enabled: boolean;
  targetLocked: boolean;
  revision: number;
  lastSyncedAt: string;
  sourceEventHash?: string;
};

type ComputeRuntimeEntry = {
  id: string;
  handle: string;
  name: string;
  resourceClass: string;
  ttlMs: number;
  lifecycle: 'allocated' | 'deallocated';
  allocatedAt: string;
  expiresAt: string;
  network: boolean;
  revision: number;
  lastSyncedAt: string;
  sourceEventHash?: string;
};

type RuntimeManifest<T> = { entries: Record<string, T>; updatedAt: string };

const scheduleTimers = new Map<string, NodeJS.Timeout>();

function runtimeManifestFile(sandboxRoot: string, name: 'scheduler-runtime' | 'compute-runtime'): string {
  return path.join(persistenceRoot(sandboxRoot), `${name}.json`);
}

async function readRuntimeManifest<T>(sandboxRoot: string, name: 'scheduler-runtime' | 'compute-runtime'): Promise<RuntimeManifest<T>> {
  try {
    const raw = await readFile(runtimeManifestFile(sandboxRoot, name), 'utf8');
    const parsed = JSON.parse(raw) as RuntimeManifest<T>;
    return { entries: isPlainObject(parsed.entries) ? (parsed.entries as Record<string, T>) : {}, updatedAt: asString(parsed.updatedAt) || new Date(0).toISOString() };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { entries: {}, updatedAt: new Date(0).toISOString() };
    throw error;
  }
}

async function writeRuntimeManifest<T>(sandboxRoot: string, name: 'scheduler-runtime' | 'compute-runtime', manifest: RuntimeManifest<T>): Promise<void> {
  await mkdir(persistenceRoot(sandboxRoot), { recursive: true });
  await writeFile(runtimeManifestFile(sandboxRoot, name), `${JSON.stringify({ ...manifest, updatedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8');
}

function stopScheduleTimer(root: string, id: string): void {
  const timerKey = `${path.resolve(root)}:${id}`;
  const timer = scheduleTimers.get(timerKey);
  if (timer) clearTimeout(timer);
  scheduleTimers.delete(timerKey);
}

function startScheduleTimer(root: string, entry: SchedulerRuntimeEntry): void {
  stopScheduleTimer(root, entry.id);
  if (!entry.enabled) return;
  const timerKey = `${path.resolve(root)}:${entry.id}`;
  const intervalMs = entry.intervalMs ?? (entry.nextRunAt ? Math.max(Date.parse(entry.nextRunAt) - Date.now(), 60_000) : undefined);
  if (!intervalMs) return;
  const timer = setTimeout(() => undefined, intervalMs);
  timer.unref?.();
  scheduleTimers.set(timerKey, timer);
}

function schedulerStateFromRecord(record: StoredRecord): SchedulerRuntimeEntry {
  const scheduler = isPlainObject(record.state.scheduler) ? record.state.scheduler : {};
  const kind = asString(scheduler.kind) === 'cron' ? 'cron' : asString(scheduler.kind) === 'interval' ? 'interval' : 'one_shot';
  return {
    id: record.id,
    kind,
    cron: asString(record.state.cron) || asString(scheduler.cron) || undefined,
    intervalMs: typeof record.state.intervalMs === 'number' ? record.state.intervalMs : typeof scheduler.intervalMs === 'number' ? scheduler.intervalMs : undefined,
    nextRunAt: asString(record.state.nextRunAt) || asString(scheduler.nextRunAt) || undefined,
    enabled: record.state.enabled !== false && record.status !== 'deleted',
    targetLocked: true,
    revision: record.revision,
    lastSyncedAt: new Date().toISOString(),
    sourceEventHash: record.eventHash,
  };
}

function computeStateFromRecord(record: StoredRecord): ComputeRuntimeEntry {
  return {
    id: record.id,
    handle: asString(record.state.computeHandle) || `pc:${sha256Json({ id: record.id, revision: record.revision }).slice(0, 24)}`,
    name: asString(record.state.name) || record.id,
    resourceClass: asString(record.state.resourceClass) || 'sandbox-worker',
    ttlMs: typeof record.state.ttlMs === 'number' ? record.state.ttlMs : 3_600_000,
    lifecycle: record.status === 'deallocated' ? 'deallocated' : 'allocated',
    allocatedAt: asString(record.state.allocatedAt) || record.createdAt,
    expiresAt: asString(record.state.expiresAt) || new Date(Date.now() + 3_600_000).toISOString(),
    network: record.state.network === true,
    revision: record.revision,
    lastSyncedAt: new Date().toISOString(),
    sourceEventHash: record.eventHash,
  };
}

async function applyScheduleRuntime(root: string, action: DsgGovernedToolAction, record: StoredRecord): Promise<SchedulerRuntimeEntry | undefined> {
  const manifest = await readRuntimeManifest<SchedulerRuntimeEntry>(root, 'scheduler-runtime');
  if (action === 'delete') {
    stopScheduleTimer(root, record.id);
    delete manifest.entries[record.id];
    await writeRuntimeManifest(root, 'scheduler-runtime', manifest);
    return undefined;
  }
  const entry = schedulerStateFromRecord(record);
  manifest.entries[record.id] = entry;
  await writeRuntimeManifest(root, 'scheduler-runtime', manifest);
  startScheduleTimer(root, entry);
  return entry;
}

async function readScheduleRuntime(root: string, id?: string): Promise<SchedulerRuntimeEntry[]> {
  const manifest = await readRuntimeManifest<SchedulerRuntimeEntry>(root, 'scheduler-runtime');
  return Object.values(manifest.entries).filter((entry) => !id || entry.id === id);
}

async function applyComputeRuntime(root: string, action: DsgGovernedToolAction, record: StoredRecord): Promise<ComputeRuntimeEntry | undefined> {
  const manifest = await readRuntimeManifest<ComputeRuntimeEntry>(root, 'compute-runtime');
  if (action === 'deallocate') {
    const existing = manifest.entries[record.id] ?? computeStateFromRecord(record);
    const entry: ComputeRuntimeEntry = { ...existing, lifecycle: 'deallocated', revision: record.revision, lastSyncedAt: new Date().toISOString(), sourceEventHash: record.eventHash };
    manifest.entries[record.id] = entry;
    await writeRuntimeManifest(root, 'compute-runtime', manifest);
    return entry;
  }
  const entry = computeStateFromRecord(record);
  manifest.entries[record.id] = entry;
  await writeRuntimeManifest(root, 'compute-runtime', manifest);
  return entry;
}

async function readComputeRuntime(root: string, id?: string): Promise<ComputeRuntimeEntry[]> {
  const manifest = await readRuntimeManifest<ComputeRuntimeEntry>(root, 'compute-runtime');
  return Object.values(manifest.entries).filter((entry) => !id || entry.id === id);
}

function recordId(tool: DsgGovernedToolKind, action: DsgGovernedToolAction, args: Record<string, unknown>): string {
  return `${tool}:${sha256Json({ action, args }).slice(0, 24)}`;
}

function buildExecutionDecisionFrame(input: DsgGovernedToolRequest, prepared: DsgGovernedToolPreparedRequest, phase: DsgExecutionDecisionFrame['phase'], extraEvidence: string[] = [], extraBlockedReasons: string[] = []): DsgExecutionDecisionFrame {
  const runtimeEvidence = [
    prepared.audit.requestHash,
    prepared.audit.id,
    `tool:${prepared.tool}`,
    `action:${prepared.action}`,
    ...extraEvidence,
  ].filter(Boolean);
  const verifiedInput = verify(
    { tool: prepared.tool, action: prepared.action, args: prepared.args, goal: input.goal.trim(), phase },
    runtimeEvidence,
  );
  const blockedReasons = [...prepared.blockedReasons, ...extraBlockedReasons];
  if (!prepared.ok) blockedReasons.push('PREPARED_REQUEST_NOT_OK');
  if (prepared.status !== 'ready') blockedReasons.push(`PREPARED_STATUS_${prepared.status.toUpperCase()}`);
  if (!prepared.decisionFrame.benefit.ok) blockedReasons.push('USER_BENEFIT_GATE_NOT_MET');
  if (!prepared.decisionFrame.truthBoundary.ok) blockedReasons.push('TRUTH_BOUNDARY_NOT_OK');
  if (prepared.decisionFrame.risk.state !== 'data_verified') blockedReasons.push('PREPARED_RISK_NOT_VERIFIED');
  if (!verifiedInput.verified) blockedReasons.push('EXECUTION_EVIDENCE_REQUIRED');
  const riskFlags = blockedReasons.filter((reason) => /BLOCKED|NOT_ALLOWLISTED|OUTSIDE|SENSITIVE|CONFIRMATION|ENDPOINT|PRIVATE|INVALID|REQUIRED|NOT_OK|NOT_VERIFIED|UNSUPPORTED|TOO_SHORT|OUT_OF_RANGE/.test(reason));
  const risk = kilesa(`${prepared.tool}:${prepared.action}:${phase}`, verifiedInput.verified && blockedReasons.length === 0, riskFlags);
  const truth = truthBoundary({ verified: verifiedInput.verified && blockedReasons.length === 0, containsSecret: false });
  const finalBlockedReasons = [...new Set([...blockedReasons, ...risk.reasons.filter((reason) => reason !== 'VERIFIED'), ...truth.blockedReasons])];
  return {
    ok: finalBlockedReasons.length === 0,
    phase,
    target: samadhi(`dsg-tool-execution:${prepared.tool}`, input.goal.trim() || 'missing-goal'),
    verifiedInput,
    risk,
    stats: parami([...(input.history ?? []), prepared.tool, prepared.action, phase]),
    benefit: userBenefitGate({
      userBenefit: 'User gets adapter execution that re-checks target, evidence, risk, truth boundary, and benefit at runtime.',
      easier: true,
      tangibleOutput: 'Execution-phase Decision Frame proof with a deterministic evidence hash.',
      nextAction: finalBlockedReasons.length ? 'Fix execution guard blockers before adapter side effects.' : 'Execute adapter and verify output evidence.',
    }),
    truthBoundary: truth,
    blockedReasons: finalBlockedReasons,
    evidenceHash: sha256Json({ runtimeEvidence, phase, requestHash: prepared.audit.requestHash }),
  };
}

function parseStoredRecord(line: string): StoredRecord | undefined {
  if (!line.trim()) return undefined;
  try {
    const parsed = JSON.parse(line) as StoredRecord;
    if (!parsed || typeof parsed !== 'object' || !asString(parsed.id)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

async function readStoredRecords(sandboxRoot: string, tool: DsgGovernedToolKind): Promise<StoredRecord[]> {
  try {
    const raw = await readFile(persistenceFile(sandboxRoot, tool), 'utf8');
    return raw.split('\n').map(parseStoredRecord).filter((record): record is StoredRecord => Boolean(record));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

function materializePersistentState(tool: DsgGovernedToolKind, action: DsgGovernedToolAction, args: Record<string, unknown>, previous?: StoredRecord): Record<string, unknown> {
  const previousState = previous?.state ?? {};
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();

  if (action === 'delete' || action === 'deallocate') {
    return {
      ...previousState,
      lifecycle: action === 'deallocate' ? 'deallocated' : 'deleted',
      enabled: false,
      deletedAt: action === 'delete' ? now : previousState.deletedAt,
      deallocatedAt: action === 'deallocate' ? now : previousState.deallocatedAt,
      deletionReason: asString(args.reason) || previousState.deletionReason,
    };
  }

  if (tool === 'schedule') {
    const intervalMs = typeof args.intervalMs === 'number' ? args.intervalMs : typeof previousState.intervalMs === 'number' ? previousState.intervalMs : undefined;
    const cron = asString(args.cron) || (typeof args.intervalMs === 'number' ? '' : asString(previousState.cron));
    const nextRunAt = asString(args.nextRunAt) || (intervalMs ? new Date(nowMs + intervalMs).toISOString() : asString(previousState.nextRunAt));
    return {
      ...previousState,
      lifecycle: 'active',
      title: asString(args.title) || asString(previousState.title) || 'Governed schedule',
      cron: cron || undefined,
      intervalMs,
      nextRunAt: nextRunAt || undefined,
      enabled: args.enabled !== false,
      scheduler: {
        kind: cron ? 'cron' : 'interval',
        cron: cron || undefined,
        intervalMs,
        nextRunAt: nextRunAt || undefined,
        targetLocked: true,
      },
    };
  }

  if (tool === 'persistent_compute') {
    const ttlMs = typeof args.ttlMs === 'number' ? args.ttlMs : typeof previousState.ttlMs === 'number' ? previousState.ttlMs : 3_600_000;
    return {
      ...previousState,
      lifecycle: 'allocated',
      name: asString(args.name) || asString(previousState.name),
      resourceClass: asString(args.resourceClass) || asString(previousState.resourceClass) || 'sandbox-worker',
      ttlMs,
      allocatedAt: previousState.allocatedAt || now,
      expiresAt: new Date(nowMs + ttlMs).toISOString(),
      network: asBoolean(args.network),
      computeHandle: asString(previousState.computeHandle) || `pc:${sha256Json({ name: args.name, resourceClass: args.resourceClass, now }).slice(0, 24)}`,
    };
  }

  return {
    ...previousState,
    lifecycle: 'active',
    title: asString(args.title) || asString(previousState.title),
    steps: Array.isArray(args.steps) ? args.steps.map((step) => String(step || '').trim()).filter(Boolean) : previousState.steps,
    status: asString(args.status) || asString(previousState.status) || (action === 'update' ? 'updated' : 'created'),
    payload: args.payload ?? previousState.payload,
  };
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
    if (['update', 'delete'].includes(input.action) && !asString(args.id)) reasons.push('SCHEDULE_ID_REQUIRED');
    if (['create', 'update'].includes(input.action)) {
      if (!asString(args.cron) && typeof args.intervalMs !== 'number' && !isValidIsoDate(args.nextRunAt)) reasons.push('SCHEDULE_CRON_OR_INTERVAL_REQUIRED');
      if (asString(args.cron) && !isValidCronExpression(args.cron)) reasons.push('SCHEDULE_CRON_INVALID');
      if (typeof args.intervalMs === 'number' && args.intervalMs < 60_000) reasons.push('SCHEDULE_INTERVAL_TOO_SHORT');
      if (args.nextRunAt !== undefined && !isValidIsoDate(args.nextRunAt)) reasons.push('SCHEDULE_NEXT_RUN_AT_INVALID');
    }
  }

  if (input.tool === 'plan' || input.tool === 'workflow') {
    if (input.action === 'create' && !asString(args.title)) reasons.push(`${input.tool.toUpperCase()}_TITLE_REQUIRED`);
    if (['update', 'delete'].includes(input.action) && !asString(args.id)) reasons.push(`${input.tool.toUpperCase()}_ID_REQUIRED`);
    if (['create', 'update'].includes(input.action) && args.payload !== undefined && !isPlainObject(args.payload)) reasons.push(`${input.tool.toUpperCase()}_PAYLOAD_INVALID`);
  }

  if (input.tool === 'persistent_compute') {
    if (input.action === 'allocate' && !asString(args.name)) reasons.push('PERSISTENT_COMPUTE_NAME_REQUIRED');
    if (input.action === 'deallocate' && !asString(args.id)) reasons.push('PERSISTENT_COMPUTE_ID_REQUIRED');
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
  const trace: AdapterStepTrace[] = [];
  const parsedUrl = parseHttpsUrl(prepared.args.url);
  const beforeFetch = buildAdapterStepTrace(prepared, 'before_fetch', { url: asString(prepared.args.url), action: prepared.action }, [asString(prepared.args.url)], parsedUrl.ok ? [] : [`BROWSER_${parsedUrl.reason}`]);
  assertAdapterStep(beforeFetch);
  trace.push(beforeFetch);

  const url = parsedUrl.url!;
  const response = await fetch(url, { headers: { accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8', 'user-agent': 'DSG-ONE-Governed-Tools/1.0' } });
  const contentType = response.headers.get('content-type') ?? '';
  const afterFetch = buildAdapterStepTrace(prepared, 'after_fetch', { url: url.toString(), status: response.status, ok: response.ok, contentType }, [`http_status:${response.status}`, `content_type:${contentType}`], response.ok ? [] : ['BROWSER_HTTP_NOT_OK']);
  assertAdapterStep(afterFetch);
  trace.push(afterFetch);

  const body = (await response.text()).slice(0, Number(prepared.args.maxBytes ?? 250_000));
  const bodyHash = sha256Json({ body });
  const beforeParse = buildAdapterStepTrace(prepared, 'before_parse', { contentType, bodyBytes: body.length }, [bodyHash]);
  assertAdapterStep(beforeParse);
  trace.push(beforeParse);

  const extracted = contentType.includes('html') ? textFromHtml(body) : { title: '', text: body.replace(/\s+/g, ' ').trim() };
  const textLimit = Number(prepared.args.textLimit ?? (prepared.action === 'scrape' ? 12_000 : 2_000));
  const afterParse = buildAdapterStepTrace(prepared, 'after_parse', { title: extracted.title, textLength: extracted.text.length, textLimit }, [sha256Json(extracted)], extracted.text ? [] : ['BROWSER_EMPTY_TEXT']);
  assertAdapterStep(afterParse);
  trace.push(afterParse);

  return { url: url.toString(), status: response.status, ok: response.ok, contentType, title: extracted.title, text: extracted.text.slice(0, textLimit), contentHash: bodyHash, adapterDecisionTrace: trace };
}

async function executeSearch(prepared: DsgGovernedToolPreparedRequest): Promise<unknown> {
  const trace: AdapterStepTrace[] = [];
  const parsedEndpoint = parseHttpsUrl(prepared.args.endpoint ?? process.env.DSG_SEARCH_ENDPOINT);
  const beforeQuery = buildAdapterStepTrace(prepared, 'before_query', { endpoint: asString(prepared.args.endpoint ?? process.env.DSG_SEARCH_ENDPOINT), query: asString(prepared.args.query) }, [sha256Json({ query: prepared.args.query })], parsedEndpoint.ok ? [] : [`SEARCH_ENDPOINT_${parsedEndpoint.reason}`]);
  assertAdapterStep(beforeQuery);
  trace.push(beforeQuery);

  const endpoint = parsedEndpoint.url!;
  endpoint.searchParams.set('q', asString(prepared.args.query));
  const response = await fetch(endpoint, { headers: { accept: 'application/json,text/plain;q=0.8', 'user-agent': 'DSG-ONE-Governed-Tools/1.0' } });
  const afterResponse = buildAdapterStepTrace(prepared, 'after_response', { endpoint: endpoint.toString(), status: response.status, ok: response.ok }, [`http_status:${response.status}`], response.ok ? [] : ['SEARCH_HTTP_NOT_OK']);
  assertAdapterStep(afterResponse);
  trace.push(afterResponse);

  const raw = (await response.text()).slice(0, Number(prepared.args.maxBytes ?? 250_000));
  let parsed: unknown = raw;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { text: raw.slice(0, Number(prepared.args.textLimit ?? 4_000)) };
  }
  const parsedTrace = buildAdapterStepTrace(prepared, 'verify_results', { responseBytes: raw.length, parsedType: Array.isArray(parsed) ? 'array' : typeof parsed }, [sha256Json({ raw })], raw ? [] : ['SEARCH_EMPTY_RESULTS']);
  assertAdapterStep(parsedTrace);
  trace.push(parsedTrace);

  return { endpoint: endpoint.toString(), status: response.status, ok: response.ok, results: parsed, resultHash: sha256Json({ raw }), adapterDecisionTrace: trace };
}


async function buildPersistentRecord(input: DsgGovernedToolRequest, prepared: DsgGovernedToolPreparedRequest, stateOverride?: Record<string, unknown>): Promise<StoredRecord> {
  const root = String(input.sandboxRoot || process.cwd());
  const records = await readStoredRecords(root, prepared.tool);
  const id = asString(prepared.args.id) || recordId(prepared.tool, prepared.action, prepared.args);
  const previous = records.filter((record) => record.id === id).at(-1);
  const now = new Date().toISOString();
  const status: StoredRecord['status'] = prepared.action === 'delete' ? 'deleted' : prepared.action === 'deallocate' ? 'deallocated' : prepared.tool === 'persistent_compute' ? 'allocated' : prepared.action === 'update' ? 'updated' : 'created';
  const state = stateOverride ?? materializePersistentState(prepared.tool, prepared.action, prepared.args, previous);
  const baseRecord = {
    id,
    tool: prepared.tool,
    action: prepared.action,
    goal: input.goal.trim(),
    args: prepared.args,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    requestHash: prepared.audit.requestHash,
    evidenceHash: sha256Json({ truth: prepared.audit.truth, args: prepared.args, goal: input.goal, state, previousEventHash: previous?.eventHash }),
    previousEventHash: previous?.eventHash,
    revision: (previous?.revision ?? 0) + 1,
    status,
    state,
  } satisfies Omit<StoredRecord, 'eventHash'>;
  return { ...baseRecord, eventHash: sha256Json(baseRecord) };
}

async function persistRecord(input: DsgGovernedToolRequest, prepared: DsgGovernedToolPreparedRequest, stateOverride?: Record<string, unknown>): Promise<StoredRecord> {
  const root = String(input.sandboxRoot || process.cwd());
  const record = await buildPersistentRecord(input, prepared, stateOverride);
  await mkdir(persistenceRoot(root), { recursive: true });
  await appendFile(persistenceFile(root, prepared.tool), `${JSON.stringify(record)}\n`, 'utf8');
  return record;
}

type PersistentAdapterOutput = {
  operation: DsgGovernedToolAction;
  truth: DsgGovernedToolPreparedRequest['audit']['truth'];
  record?: StoredRecord;
  records?: StoredRecord[];
  adapterDecisionTrace: AdapterStepTrace[];
  outputHash: string;
};

async function executePersistence(input: DsgGovernedToolRequest, prepared: DsgGovernedToolPreparedRequest): Promise<PersistentAdapterOutput> {
  const root = String(input.sandboxRoot || process.cwd());
  const id = asString(prepared.args.id) || recordId(prepared.tool, prepared.action, prepared.args);
  const trace: AdapterStepTrace[] = [];

  const targetTrace = buildAdapterStepTrace(prepared, 'target_lock', { goal: input.goal, id, action: prepared.action }, [id]);
  assertAdapterStep(targetTrace);
  trace.push(targetTrace);

  const records = await readStoredRecords(root, prepared.tool);
  const readTrace = buildAdapterStepTrace(prepared, 'read_stored_records', { root: persistenceRoot(root), count: records.length }, [sha256Json({ ids: records.map((record) => record.id), count: records.length })]);
  assertAdapterStep(readTrace);
  trace.push(readTrace);

  if (prepared.action === 'read') {
    const resultRecords = asString(prepared.args.id) ? records.filter((record) => record.id === id) : activeStoredRecords(records);
    const latest = resultRecords.at(-1);
    const runtimeState = prepared.tool === 'schedule'
      ? await readScheduleRuntime(root, asString(prepared.args.id) ? id : undefined)
      : prepared.tool === 'persistent_compute'
        ? await readComputeRuntime(root, asString(prepared.args.id) ? id : undefined)
        : [];
    const runtimeIds = new Set(runtimeState.map((entry) => entry.id));
    const missingRuntimeIds = resultRecords
      .filter((record) => ['schedule', 'persistent_compute'].includes(record.tool) && !['deleted', 'deallocated'].includes(record.status) && !runtimeIds.has(record.id))
      .map((record) => record.id);
    const verifyTrace = buildAdapterStepTrace(
      prepared,
      'verify_read_state',
      { id: asString(prepared.args.id) ? id : 'all-active', count: resultRecords.length, latestStatus: latest?.status, runtimeCount: runtimeState.length, missingRuntimeIds },
      [sha256Json({ resultRecords, runtimeState })],
      [
        ...(resultRecords.length === 0 && asString(prepared.args.id) ? ['PERSISTENCE_RECORD_NOT_FOUND'] : []),
        ...(missingRuntimeIds.length ? ['PERSISTENCE_RUNTIME_STATE_MISMATCH'] : []),
      ],
    );
    assertAdapterStep(verifyTrace);
    trace.push(verifyTrace);
    const output = { operation: prepared.action, truth: prepared.audit.truth, record: latest, records: asString(prepared.args.id) ? undefined : resultRecords, runtimeState, adapterDecisionTrace: trace, outputHash: '' } as PersistentAdapterOutput & { runtimeState: unknown[] };
    output.outputHash = sha256Json({ record: output.record, records: output.records, runtimeState, trace: trace.map((step) => step.evidenceHash) });
    return output;
  }

  const previous = records.filter((record) => record.id === id).at(-1);
  const existingActive = previous && !['deleted', 'deallocated'].includes(previous.status);
  const riskFlags: string[] = [];
  if (['update', 'delete', 'deallocate'].includes(prepared.action) && !existingActive) riskFlags.push('PERSISTENCE_RECORD_NOT_FOUND');
  if (prepared.action === 'create' && existingActive) riskFlags.push('PERSISTENCE_RECORD_ALREADY_EXISTS');
  if (prepared.tool === 'schedule' && ['create', 'update'].includes(prepared.action) && asString(prepared.args.cron) && !isValidCronExpression(prepared.args.cron)) riskFlags.push('SCHEDULE_CRON_INVALID');
  const verifyTrace = buildAdapterStepTrace(prepared, 'verify_mutation_request', { id, previousRevision: previous?.revision, previousStatus: previous?.status, args: prepared.args }, [sha256Json({ previous, args: prepared.args })], riskFlags);
  assertAdapterStep(verifyTrace);
  trace.push(verifyTrace);

  const materializedState = materializePersistentState(prepared.tool, prepared.action, prepared.args, previous);
  const materializeTrace = buildAdapterStepTrace(prepared, 'materialize_state', { id, state: materializedState }, [sha256Json(materializedState)]);
  assertAdapterStep(materializeTrace);
  trace.push(materializeTrace);

  const tentativeRecord = await buildPersistentRecord(input, prepared, materializedState);
  let runtimeState: SchedulerRuntimeEntry | ComputeRuntimeEntry | undefined;
  if (prepared.tool === 'schedule') {
    const schedulerTrace = buildAdapterStepTrace(prepared, 'scheduler_apply', { id, action: prepared.action, revision: tentativeRecord.revision }, [tentativeRecord.eventHash]);
    assertAdapterStep(schedulerTrace);
    trace.push(schedulerTrace);
    runtimeState = await applyScheduleRuntime(root, prepared.action, tentativeRecord);
  } else if (prepared.tool === 'persistent_compute') {
    const provisionerTrace = buildAdapterStepTrace(prepared, 'provisioner_apply', { id, action: prepared.action, revision: tentativeRecord.revision }, [tentativeRecord.eventHash]);
    assertAdapterStep(provisionerTrace);
    trace.push(provisionerTrace);
    runtimeState = await applyComputeRuntime(root, prepared.action, tentativeRecord);
  }

  const runtimeVerifyTrace = buildAdapterStepTrace(prepared, 'verify_runtime_side_effect', { id, action: prepared.action, hasRuntimeState: Boolean(runtimeState), runtimeState }, [sha256Json(runtimeState ?? { removed: true, id })]);
  assertAdapterStep(runtimeVerifyTrace);
  trace.push(runtimeVerifyTrace);

  const record = await persistRecord(input, prepared, { ...materializedState, runtimeState });
  if (prepared.tool === 'schedule') runtimeState = await applyScheduleRuntime(root, prepared.action, record);
  if (prepared.tool === 'persistent_compute') runtimeState = await applyComputeRuntime(root, prepared.action, record);
  const persistTrace = buildAdapterStepTrace(prepared, 'persist_append_only_record', { id, revision: record.revision, status: record.status }, [record.eventHash]);
  assertAdapterStep(persistTrace);
  trace.push(persistTrace);

  const output = { operation: prepared.action, truth: prepared.audit.truth, record, runtimeState, adapterDecisionTrace: trace, outputHash: '' } as PersistentAdapterOutput & { runtimeState?: SchedulerRuntimeEntry | ComputeRuntimeEntry };
  output.outputHash = sha256Json({ record, runtimeState, trace: trace.map((step) => step.evidenceHash) });
  return output;
}

async function executeApi(prepared: DsgGovernedToolPreparedRequest): Promise<unknown> {
  const trace: AdapterStepTrace[] = [];
  const parsedUrl = parseHttpsUrl(prepared.args.url);
  const method = asString(prepared.args.method || (prepared.action === 'query' ? 'GET' : 'POST')).toUpperCase();
  const body = method === 'GET' ? undefined : JSON.stringify(prepared.args.body ?? {});
  const beforeRequest = buildAdapterStepTrace(prepared, 'before_request', { url: asString(prepared.args.url), method, hasBody: body !== undefined }, [sha256Json({ url: prepared.args.url, method, body })], parsedUrl.ok ? [] : [`API_${parsedUrl.reason}`]);
  assertAdapterStep(beforeRequest);
  trace.push(beforeRequest);

  const url = parsedUrl.url!;
  const response = await fetch(url, { method, headers: { accept: 'application/json,text/plain;q=0.8', 'content-type': 'application/json' }, body });
  const afterResponse = buildAdapterStepTrace(prepared, 'after_response', { url: url.toString(), method, status: response.status, ok: response.ok }, [`http_status:${response.status}`], response.ok ? [] : ['API_HTTP_NOT_OK']);
  assertAdapterStep(afterResponse);
  trace.push(afterResponse);

  const raw = (await response.text()).slice(0, Number(prepared.args.maxBytes ?? 250_000));
  let parsed: unknown = raw;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { text: raw.slice(0, Number(prepared.args.textLimit ?? 4_000)) };
  }
  const verifyResponse = buildAdapterStepTrace(prepared, 'verify_response_body', { responseBytes: raw.length, parsedType: Array.isArray(parsed) ? 'array' : typeof parsed }, [sha256Json({ raw })]);
  assertAdapterStep(verifyResponse);
  trace.push(verifyResponse);

  return { url: url.toString(), method, status: response.status, ok: response.ok, body: parsed, bodyHash: sha256Json({ raw }), adapterDecisionTrace: trace };
}

async function executeGoogleWorkspace(prepared: DsgGovernedToolPreparedRequest): Promise<unknown> {
  const trace: AdapterStepTrace[] = [];
  const parsedEndpoint = parseHttpsUrl(prepared.args.endpoint ?? process.env.DSG_GOOGLE_WORKSPACE_ENDPOINT);
  const operation = asString(prepared.args.operation);
  const requestPayload = { operation, payload: prepared.args.payload ?? {} };
  const beforeRequest = buildAdapterStepTrace(prepared, 'before_workspace_request', { endpoint: asString(prepared.args.endpoint ?? process.env.DSG_GOOGLE_WORKSPACE_ENDPOINT), operation }, [sha256Json(requestPayload)], parsedEndpoint.ok ? [] : [`GOOGLE_WORKSPACE_ENDPOINT_${parsedEndpoint.reason}`]);
  assertAdapterStep(beforeRequest);
  trace.push(beforeRequest);

  const endpoint = parsedEndpoint.url!;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { accept: 'application/json,text/plain;q=0.8', 'content-type': 'application/json' },
    body: JSON.stringify(requestPayload),
  });
  const afterResponse = buildAdapterStepTrace(prepared, 'after_workspace_response', { endpoint: endpoint.toString(), operation, status: response.status, ok: response.ok }, [`http_status:${response.status}`], response.ok ? [] : ['GOOGLE_WORKSPACE_HTTP_NOT_OK']);
  assertAdapterStep(afterResponse);
  trace.push(afterResponse);

  const raw = (await response.text()).slice(0, Number(prepared.args.maxBytes ?? 250_000));
  let parsed: unknown = raw;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { text: raw.slice(0, Number(prepared.args.textLimit ?? 4_000)) };
  }
  const verifyResponse = buildAdapterStepTrace(prepared, 'verify_workspace_body', { responseBytes: raw.length, parsedType: Array.isArray(parsed) ? 'array' : typeof parsed }, [sha256Json({ raw })]);
  assertAdapterStep(verifyResponse);
  trace.push(verifyResponse);

  return { operation, status: response.status, ok: response.ok, body: parsed, bodyHash: sha256Json({ raw }), adapterDecisionTrace: trace };
}


export async function executeGovernedToolRequest(input: DsgGovernedToolRequest): Promise<DsgGovernedToolExecutionResult> {
  const prepared = prepareGovernedToolRequest(input);
  const executionFrame = buildExecutionDecisionFrame(input, prepared, 'preflight');
  if (!executionFrame.ok) return { ok: false, prepared, outputVerification: 'blocked_before_execution', executionDecisionFrame: executionFrame };

  if (prepared.tool === 'shell') {
    const adapterFrame = buildExecutionDecisionFrame(input, prepared, 'adapter_execution', ['adapter:shell.exec']);
    if (!adapterFrame.ok) return { ok: false, prepared, outputVerification: 'blocked_before_execution', executionDecisionFrame: adapterFrame };
    const { bin, args } = splitCommand(asString(prepared.args.command));
    const { stdout, stderr } = await execFileAsync(bin, args, { cwd: input.sandboxRoot || process.cwd(), timeout: Number(prepared.args.timeoutMs ?? 10_000), maxBuffer: 1024 * 1024 });
    const output = { stdout, stderr, outputHash: sha256Json({ stdout, stderr }) };
    return { ok: true, prepared, output, outputVerification: 'runtime_evidence', executionDecisionFrame: buildExecutionDecisionFrame(input, prepared, 'output_verification', [sha256Json(output)]) };
  }

  if (prepared.tool === 'file') {
    const checked = pathInsideSandbox(String(input.sandboxRoot || process.cwd()), asString(prepared.args.path));
    const adapterFrame = buildExecutionDecisionFrame(input, prepared, 'adapter_execution', ['adapter:file', checked.absolutePath], checked.ok ? [] : [checked.reason ?? 'PATH_CHECK_FAILED']);
    if (!adapterFrame.ok || !checked.ok) return { ok: false, prepared, outputVerification: 'blocked_before_execution', executionDecisionFrame: adapterFrame };
    if (prepared.action === 'read') {
      const content = await readFile(checked.absolutePath, 'utf8');
      const output = { path: prepared.args.path, content, contentHash: sha256Json({ content }) };
      return { ok: true, prepared, output, outputVerification: 'runtime_evidence', executionDecisionFrame: buildExecutionDecisionFrame(input, prepared, 'output_verification', [output.contentHash]) };
    }
    await mkdir(path.dirname(checked.absolutePath), { recursive: true });
    if (prepared.action === 'append') await appendFile(checked.absolutePath, String(prepared.args.content), 'utf8');
    else await writeFile(checked.absolutePath, String(prepared.args.content), 'utf8');
    const output = { path: prepared.args.path, contentHash: sha256Json({ content: prepared.args.content }) };
    return { ok: true, prepared, output, outputVerification: 'runtime_evidence', executionDecisionFrame: buildExecutionDecisionFrame(input, prepared, 'output_verification', [output.contentHash]) };
  }

  if (prepared.tool === 'browser') {
    const adapterFrame = buildExecutionDecisionFrame(input, prepared, 'adapter_execution', ['adapter:browser']);
    if (!adapterFrame.ok) return { ok: false, prepared, outputVerification: 'blocked_before_execution', executionDecisionFrame: adapterFrame };
    try {
      const output = await executeBrowser(prepared);
      return { ok: true, prepared, output, outputVerification: 'runtime_evidence', executionDecisionFrame: buildExecutionDecisionFrame(input, prepared, 'output_verification', [sha256Json(output)]) };
    } catch (error) {
      return { ok: false, prepared, outputVerification: 'blocked_before_execution', executionDecisionFrame: buildExecutionDecisionFrame(input, prepared, 'adapter_execution', ['adapter:browser:fail_closed'], adapterErrorBlockedReasons(error)) };
    }
  }
  if (prepared.tool === 'search') {
    const adapterFrame = buildExecutionDecisionFrame(input, prepared, 'adapter_execution', ['adapter:search']);
    if (!adapterFrame.ok) return { ok: false, prepared, outputVerification: 'blocked_before_execution', executionDecisionFrame: adapterFrame };
    try {
      const output = await executeSearch(prepared);
      return { ok: true, prepared, output, outputVerification: 'runtime_evidence', executionDecisionFrame: buildExecutionDecisionFrame(input, prepared, 'output_verification', [sha256Json(output)]) };
    } catch (error) {
      return { ok: false, prepared, outputVerification: 'blocked_before_execution', executionDecisionFrame: buildExecutionDecisionFrame(input, prepared, 'adapter_execution', ['adapter:search:fail_closed'], adapterErrorBlockedReasons(error)) };
    }
  }
  if (persistedToolKinds.has(prepared.tool)) {
    const root = String(input.sandboxRoot || process.cwd());
    const id = asString(prepared.args.id) || recordId(prepared.tool, prepared.action, prepared.args);
    const records = await readStoredRecords(root, prepared.tool);
    const previous = records.filter((record) => record.id === id).at(-1);
    const previousActive = previous && !['deleted', 'deallocated'].includes(previous.status);
    const persistenceBlocked = ['update', 'delete', 'deallocate'].includes(prepared.action) && !previousActive ? ['PERSISTENCE_RECORD_NOT_FOUND'] : [];
    const adapterFrame = buildExecutionDecisionFrame(input, prepared, 'adapter_execution', ['adapter:persistence', id], persistenceBlocked);
    if (!adapterFrame.ok) return { ok: false, prepared, outputVerification: 'blocked_before_execution', executionDecisionFrame: adapterFrame };
    try {
      const output = await executePersistence(input, prepared);
      return { ok: true, prepared, output, outputVerification: 'runtime_evidence', executionDecisionFrame: buildExecutionDecisionFrame(input, prepared, 'output_verification', [output.outputHash]) };
    } catch (error) {
      return { ok: false, prepared, outputVerification: 'blocked_before_execution', executionDecisionFrame: buildExecutionDecisionFrame(input, prepared, 'adapter_execution', ['adapter:persistence:fail_closed', id], adapterErrorBlockedReasons(error)) };
    }
  }
  if (prepared.tool === 'api') {
    const adapterFrame = buildExecutionDecisionFrame(input, prepared, 'adapter_execution', ['adapter:api']);
    if (!adapterFrame.ok) return { ok: false, prepared, outputVerification: 'blocked_before_execution', executionDecisionFrame: adapterFrame };
    try {
      const output = await executeApi(prepared);
      return { ok: true, prepared, output, outputVerification: 'runtime_evidence', executionDecisionFrame: buildExecutionDecisionFrame(input, prepared, 'output_verification', [sha256Json(output)]) };
    } catch (error) {
      return { ok: false, prepared, outputVerification: 'blocked_before_execution', executionDecisionFrame: buildExecutionDecisionFrame(input, prepared, 'adapter_execution', ['adapter:api:fail_closed'], adapterErrorBlockedReasons(error)) };
    }
  }
  if (prepared.tool === 'google_workspace') {
    const adapterFrame = buildExecutionDecisionFrame(input, prepared, 'adapter_execution', ['adapter:google_workspace']);
    if (!adapterFrame.ok) return { ok: false, prepared, outputVerification: 'blocked_before_execution', executionDecisionFrame: adapterFrame };
    try {
      const output = await executeGoogleWorkspace(prepared);
      return { ok: true, prepared, output, outputVerification: 'runtime_evidence', executionDecisionFrame: buildExecutionDecisionFrame(input, prepared, 'output_verification', [sha256Json(output)]) };
    } catch (error) {
      return { ok: false, prepared, outputVerification: 'blocked_before_execution', executionDecisionFrame: buildExecutionDecisionFrame(input, prepared, 'adapter_execution', ['adapter:google_workspace:fail_closed'], adapterErrorBlockedReasons(error)) };
    }
  }

  const fallbackFrame = buildExecutionDecisionFrame(input, prepared, 'adapter_execution', [], ['ADAPTER_NOT_IMPLEMENTED']);
  return { ok: false, prepared, outputVerification: 'blocked_before_execution', executionDecisionFrame: fallbackFrame };
}
