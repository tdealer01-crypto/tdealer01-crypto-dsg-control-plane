export type DsgSandboxGateStatus = 'PASS' | 'REVIEW' | 'BLOCK';

export type DsgSandboxGateResult = {
  status: DsgSandboxGateStatus;
  reasons: string[];
  allowed: boolean;
};

export const DSG_ALLOWED_AGENT_WRITE_PREFIXES = [
  'app/generated-apps/',
  'app/api/generated-apps/',
  'docs/dsg-generated-apps/',
  'docs/dsg-agent-runs/',
  'supabase/migrations/',
] as const;

export const DSG_ALLOWED_AGENT_COMMANDS = [
  'npm run dsg:typecheck',
  'npm run dsg:product-ready',
  'npm run build:termux',
  'npm run build',
] as const;

export function evaluatePathGate(paths: string[]): DsgSandboxGateResult {
  const reasons: string[] = [];
  const blocked = paths.filter((path) => !DSG_ALLOWED_AGENT_WRITE_PREFIXES.some((prefix) => path.startsWith(prefix)));

  if (blocked.length) {
    reasons.push(`BLOCKED_PATHS:${blocked.join(',')}`);
    return { status: 'BLOCK', reasons, allowed: false };
  }

  if (!paths.length) {
    return { status: 'REVIEW', reasons: ['NO_FILE_WRITES_REQUESTED'], allowed: false };
  }

  reasons.push('PATH_GATE_PASS');
  return { status: 'PASS', reasons, allowed: true };
}

export function evaluateCommandGate(commands: string[]): DsgSandboxGateResult {
  const reasons: string[] = [];
  const blocked = commands.filter((command) => !DSG_ALLOWED_AGENT_COMMANDS.includes(command as (typeof DSG_ALLOWED_AGENT_COMMANDS)[number]));

  if (blocked.length) {
    reasons.push(`BLOCKED_COMMANDS:${blocked.join(',')}`);
    return { status: 'BLOCK', reasons, allowed: false };
  }

  if (!commands.length) {
    return { status: 'REVIEW', reasons: ['NO_COMMANDS_REQUESTED'], allowed: false };
  }

  reasons.push('COMMAND_GATE_PASS');
  return { status: 'PASS', reasons, allowed: true };
}

export function evaluateSecretBoundary(value: string): DsgSandboxGateResult {
  const patterns = [/service[_-]?role/i, /api[_-]?key/i, /secret/i, /token/i, /password/i, /sk_live_/i, /ghp_/i];
  const hasSecretLikeText = patterns.some((pattern) => pattern.test(value));
  if (hasSecretLikeText) {
    return { status: 'BLOCK', reasons: ['SECRET_LIKE_TEXT_DETECTED'], allowed: false };
  }
  return { status: 'PASS', reasons: ['SECRET_BOUNDARY_PASS'], allowed: true };
}

export function makeAgentBranchName(jobId: string): string {
  const safeJobId = jobId.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'adhoc';
  return `dsg-agent/${safeJobId}-${Date.now()}`;
}
