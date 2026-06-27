import crypto from 'crypto';
import {
  BLOCKED_TOOL_PATTERNS,
  COMMAND_TTL_MS,
  DsgCommandEnvelope,
  DsgCommandToolName,
  POLICY_VERSION,
  TOOL_POLICY,
} from './schema';

function nowIso() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(obj[key])}`).join(',')}}`;
}

export function sha256(value: string): string {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function privateLikePath(path: string) {
  const lowered = path.toLowerCase();
  return lowered.endsWith('.env') || lowered.includes('api_key') || lowered.includes('apikey') || lowered.includes('private') || lowered.endsWith('.pem') || lowered.endsWith('.key');
}

export function normalizeArgs(toolName: DsgCommandToolName, args: Record<string, unknown>) {
  if (toolName === 'device.open_url') {
    const raw = String(args.url ?? '').trim();
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Unsupported URL scheme');
    return { url: url.toString(), scheme: url.protocol.replace(':', '') };
  }
  if (toolName === 'device.open_app') {
    return { packageName: String(args.packageName ?? args.target ?? '').trim() };
  }
  if (toolName === 'device.open_settings') {
    return { screen: String(args.screen ?? 'android_settings').trim() };
  }
  if (toolName === 'ui.scroll') {
    return { direction: String(args.direction ?? 'down').trim(), amount: 'single_step' };
  }
  if (toolName.startsWith('file.')) {
    const path = String(args.path ?? args.target ?? '/sdcard').trim();
    return {
      path,
      requestedMode: String(args.mode ?? 'owner-approved').trim(),
      sensitive: privateLikePath(path),
      selectedFiles: Array.isArray(args.selectedFiles) ? args.selectedFiles : [],
    };
  }
  return { ...args };
}

export function buildCommandEnvelope(input: {
  sourceKind?: DsgCommandEnvelope['source']['kind'];
  actorType?: DsgCommandEnvelope['source']['actorType'];
  actorId?: string;
  sessionId?: string;
  deviceId?: string;
  toolName: string;
  args?: Record<string, unknown>;
  idempotencyKey?: string;
}): DsgCommandEnvelope {
  if (BLOCKED_TOOL_PATTERNS.some((pattern) => pattern.test(input.toolName))) {
    throw new Error('Blocked command pattern');
  }
  const toolName = input.toolName as DsgCommandToolName;
  const policy = TOOL_POLICY[toolName];
  if (!policy) throw new Error(`Unsupported tool: ${input.toolName}`);

  const args = input.args ?? {};
  const normalizedArgs = normalizeArgs(toolName, args);
  const fileNeedsBlock = toolName.startsWith('file.') && normalizedArgs.sensitive === true;
  const effectivePolicy = fileNeedsBlock ? { ...policy, class: 'BLOCK' as const, risk: 'blocked' as const } : policy;

  const requestedAt = nowIso();
  const expiresAt = new Date(Date.now() + COMMAND_TTL_MS).toISOString();
  const target = {
    deviceId: input.deviceId ?? String(args.deviceId ?? 'android.owner.default'),
    platform: 'android' as const,
    channel: 'owner-agent' as const,
  };
  const key = input.idempotencyKey ?? `${toolName}:${target.deviceId}:${canonicalJson(normalizedArgs)}`;
  const digestMaterial = canonicalJson({
    target,
    toolName,
    normalizedArgs,
    risk: effectivePolicy.risk,
    expiresAt,
    policyVersion: POLICY_VERSION,
    idempotencyKey: key,
  });
  const digest = sha256(digestMaterial);
  const decision = effectivePolicy.class === 'BLOCK' ? 'BLOCK' : effectivePolicy.class === 'REVIEW' ? 'REVIEW' : 'ALLOW';

  return {
    version: 'dsg.command/1',
    commandId: id('cmd'),
    correlationId: id('req'),
    source: {
      kind: input.sourceKind ?? 'mcp',
      actorType: input.actorType ?? 'user',
      actorId: input.actorId ?? 'operator:local',
      sessionId: input.sessionId,
    },
    target,
    tool: {
      name: toolName,
      class: effectivePolicy.class,
    },
    args,
    normalizedArgs,
    policy: {
      decision,
      risk: effectivePolicy.risk,
      requiresOwnerApproval: decision !== 'BLOCK',
      requiresPermissions: effectivePolicy.requiresPermissions,
      policyVersion: POLICY_VERSION,
      expiresAt,
    },
    idempotency: { key, digest },
    approval: {
      state: 'awaiting_owner',
      boundFields: ['target.deviceId', 'tool.name', 'normalizedArgs', 'policy.risk', 'policy.expiresAt', 'policy.policyVersion'],
      localSignatureRequired: decision !== 'BLOCK',
    },
    audit: {
      requestedAt,
      traceId: id('trace'),
      deviceEvents: [],
    },
    executionState: decision === 'BLOCK' ? 'blocked' : 'awaiting_owner',
  };
}

export function isExpired(expiresAt: string, now = new Date()) {
  return new Date(expiresAt).getTime() <= now.getTime();
}
