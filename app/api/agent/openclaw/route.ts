import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type AgentDecision = 'PASS' | 'REVIEW' | 'BLOCK' | 'UNSUPPORTED';

type CommandDecision = {
  decision: AgentDecision;
  httpStatus: number;
  reason: string;
  nextAction: string;
};

const OPENCLAW_APP = {
  id: 'openclaw-android',
  displayName: 'OpenClaw Android',
  mappedLike: 'Kimi Claw Android one-click setup',
  setupStep: 'Configure API Key',
  configureButton: 'Configure',
} as const;

const ALLOWED_READ_ONLY_COMMANDS = [
  'configure',
  'openclaw.configure',
  'setup_preview',
  'status_check',
] as const;

const BLOCKED_COMMAND_PATTERNS = [
  /deploy/i,
  /merge/i,
  /release/i,
  /env/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /service[_-]?role/i,
  /write/i,
  /delete/i,
  /database[_-]?mutation/i,
  /supabase[_-]?admin/i,
] as const;

const SECRET_VALUE_PATTERNS = [
  /sk-[a-z0-9_-]{12,}/i,
  /ghp_[a-z0-9_]{12,}/i,
  /github_pat_[a-z0-9_]{12,}/i,
  /xox[baprs]-[a-z0-9-]{12,}/i,
  /service[_-]?role/i,
  /private[_-]?key/i,
  /vercel[_-]?token/i,
  /supabase[_-]?service[_-]?role[_-]?key/i,
] as const;

function nowIso() {
  return new Date().toISOString();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function sanitizeString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, 160);
}

function payloadContainsSecretLikeValue(payload: unknown): boolean {
  const raw = JSON.stringify(payload ?? {});
  return SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(raw));
}

function classifyCommand(command: string, payload: Record<string, unknown>): CommandDecision {
  if (payloadContainsSecretLikeValue(payload)) {
    return {
      decision: 'BLOCK',
      httpStatus: 403,
      reason: 'Mobile setup must not send or store production secrets, API keys, tokens, or service-role credentials.',
      nextAction: 'Remove secrets from the mobile payload and use a backend-managed connector key.',
    };
  }

  if (!command) {
    return {
      decision: 'REVIEW',
      httpStatus: 400,
      reason: 'Missing command.',
      nextAction: 'Send command=status_check or command=openclaw.configure for the first mobile smoke test.',
    };
  }

  if (ALLOWED_READ_ONLY_COMMANDS.includes(command as (typeof ALLOWED_READ_ONLY_COMMANDS)[number])) {
    return {
      decision: 'PASS',
      httpStatus: 200,
      reason: 'Read-only OpenClaw mobile command accepted.',
      nextAction: 'Call /api/agent/status and display the repo/env/db status in the Android app.',
    };
  }

  if (BLOCKED_COMMAND_PATTERNS.some((pattern) => pattern.test(command))) {
    return {
      decision: 'BLOCK',
      httpStatus: 403,
      reason: 'This mobile bridge is read-only. Deploy, merge, env, secret, write, delete, and database mutation commands are blocked.',
      nextAction: 'Route privileged actions through the normal DSG review gate with explicit approval and audit evidence.',
    };
  }

  return {
    decision: 'REVIEW',
    httpStatus: 202,
    reason: 'Unknown OpenClaw command. It was not executed.',
    nextAction: 'Add an explicit allow-list entry and tests before enabling this command.',
  };
}

function setupManifest() {
  return {
    ok: true,
    app: OPENCLAW_APP,
    oneClickSetup: {
      label: 'OpenClaw one-click setup',
      apiKeyMode: 'backend-managed',
      mobileShouldStoreSecrets: false,
      configureEndpoint: '/api/agent/openclaw',
      statusEndpoint: '/api/agent/status',
      allowedCommands: ALLOWED_READ_ONLY_COMMANDS,
    },
    decisionPolicy: {
      pass: 'read-only configure/status commands only',
      review: 'unknown commands or malformed command requests',
      block: 'secrets, API keys, tokens, deploy, merge, env, write, delete, and database mutation commands',
    },
    checks: {
      writeEnabled: false,
      deployEnabled: false,
      mobileSecretStorageEnabled: false,
    },
    ts: nowIso(),
  };
}

export async function GET() {
  return NextResponse.json(setupManifest());
}

export async function POST(request: Request) {
  const payload = asRecord(await request.json().catch(() => null));

  if (!payload) {
    return NextResponse.json(
      {
        ok: false,
        app: OPENCLAW_APP,
        decision: 'REVIEW',
        reason: 'Request body must be a JSON object.',
        nextAction: 'Send a JSON body with source, target, and command.',
        ts: nowIso(),
      },
      { status: 400 },
    );
  }

  const source = sanitizeString(payload.source, OPENCLAW_APP.id) || OPENCLAW_APP.id;
  const target = sanitizeString(payload.target, 'dsg-control-plane') || 'dsg-control-plane';
  const command = sanitizeString(payload.command ?? payload.action);
  const commandDecision = classifyCommand(command, payload);

  return NextResponse.json(
    {
      ok: commandDecision.decision === 'PASS',
      app: OPENCLAW_APP,
      source,
      target,
      command,
      decision: commandDecision.decision,
      reason: commandDecision.reason,
      nextAction: commandDecision.nextAction,
      statusUrl: '/api/agent/status',
      checks: {
        readOnly: true,
        secretAccepted: false,
        writeEnabled: false,
        deployEnabled: false,
      },
      ts: nowIso(),
    },
    { status: commandDecision.httpStatus },
  );
}
