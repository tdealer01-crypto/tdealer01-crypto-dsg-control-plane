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

  const requestedAt = nowIso();
  const expiresAt = new Date(Date.now() + COMMAND_TTL_MS).toISOString();
  const args = input.args ?? {};
  const normalizedArgs = normalizeArgs(toolName, args);
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
    risk: policy.risk,
    expiresAt,
    policyVersion: POLICY_VERSION,
    idempotencyKey: key,
  });
  const digest = sha256(digestMaterial);

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
      class: policy.class,
    },
    args,
    normalizedArgs,
    policy: {
      decision: policy.class === 'BLOCK' ? 'BLOCK' : policy.class === 'REVIEW' ? 'REVIEW' : 'ALLOW',
      risk: policy.risk,
      requiresOwnerApproval: true,
      requiresPermissions: policy.requiresPermissions,
      policyVersion: POLICY_VERSION,
      expiresAt,
    },
    idempotency: { key, digest },
    approval: {
      state: 'awaiting_owner',
      boundFields: ['target.deviceId', 'tool.name', 'normalizedArgs', 'policy.risk', 'policy.expiresAt', 'policy.policyVersion'],
      localSignatureRequired: true,
    },
    audit: {
      requestedAt,
      traceId: id('trace'),
    },
    executionState: 'awaiting_owner',
  };
}

export function isExpired(expiresAt: string, now = new Date()) {
  return new Date(expiresAt).getTime() <= now.getTime();
}
