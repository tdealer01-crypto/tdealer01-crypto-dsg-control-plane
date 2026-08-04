import { createHash } from 'crypto';

export const AGENT_WORKSPACE_KEY = 'dsg-agent-dev';

export const DEVELOPMENT_ENVIRONMENTS = ['development', 'preview'] as const;
export type AgentWorkspaceEnvironment = (typeof DEVELOPMENT_ENVIRONMENTS)[number] | 'production';

export const DEFAULT_DEVELOPMENT_SCOPES = [
  'repo.*',
  'database.*',
  'deploy.preview.*',
  'stripe.test.*',
  'tool.*',
  'test.*',
  'build.*',
  'browser.*',
  'logs.read',
  'evidence.*',
  'workspace.*',
] as const;

export const PRODUCTION_PROMOTION_SCOPES = [
  'deploy.production',
  'database.production.*',
  'stripe.live.*',
] as const;

export const DEFAULT_LEASE_SCOPES = [
  ...DEFAULT_DEVELOPMENT_SCOPES,
  ...PRODUCTION_PROMOTION_SCOPES,
] as const;

export const DEFAULT_WORKSPACE_PLAN = {
  goal: 'Complete DSG ONE development without repeated per-action approval inside isolated development and preview environments.',
  allowed: [
    'inspect and modify repository branches',
    'create tests, scripts, MCP tools and development utilities',
    'read and mutate the development Supabase project including migrations',
    'create and inspect Vercel preview deployments',
    'read and mutate Stripe test-mode resources',
    'run builds, tests, security checks and evidence collection',
  ],
  excluded: [
    'production deployment without an approved promotion',
    'production database mutation without an approved promotion',
    'Stripe live-mode write without an approved promotion',
    'secret value export or logging',
    'claims not supported by recorded evidence',
  ],
} as const;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function hashWorkspacePlan(plan: unknown): string {
  return createHash('sha256').update(canonicalJson(plan)).digest('hex');
}

export function scopeMatches(grantedScopes: readonly string[], requestedScope: string): boolean {
  const requested = requestedScope.trim();
  if (!requested) return false;

  return grantedScopes.some((grantedScope) => {
    const granted = grantedScope.trim();
    if (!granted) return false;
    if (granted === '*' || granted === requested) return true;
    if (!granted.endsWith('.*')) return false;
    return requested.startsWith(granted.slice(0, -1));
  });
}

export function isDevelopmentEnvironment(environment: string): environment is 'development' | 'preview' {
  return environment === 'development' || environment === 'preview';
}

const SECRET_NAME_PATTERN = /(secret|token|password|private[_-]?key|service[_-]?role|api[_-]?key)/i;
const SECRET_VALUE_PATTERNS = [
  /sk_(?:live|test)_[A-Za-z0-9]+/,
  /rk_(?:live|test)_[A-Za-z0-9]+/,
  /whsec_[A-Za-z0-9]+/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /Bearer\s+[A-Za-z0-9._~+/=-]+/i,
];

export function containsSecretMaterial(value: unknown, parentKey = ''): boolean {
  const isReferenceField = /refs?$/i.test(parentKey) && SECRET_NAME_PATTERN.test(parentKey);
  if (isReferenceField) return false;
  if (SECRET_NAME_PATTERN.test(parentKey)) return value !== null && value !== '';
  if (typeof value === 'string') return SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));
  if (Array.isArray(value)) return value.some((item) => containsSecretMaterial(item, parentKey));
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .some(([key, nested]) => containsSecretMaterial(nested, key));
  }
  return false;
}

export function normalizeWorkspaceEnvironment(value: unknown): AgentWorkspaceEnvironment | null {
  const environment = String(value ?? '').trim().toLowerCase();
  if (environment === 'development' || environment === 'preview' || environment === 'production') {
    return environment;
  }
  return null;
}
