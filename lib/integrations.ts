import { randomUUID, createHash } from 'crypto';
import { isIP } from 'net';
import { getSupabaseAdmin } from './supabase-server';
import { resolveQuickstartPolicyId } from './supabase/resolve-policy';
import { generateWebhookSecret } from './security/secret-crypto';

export type IntegrationStatus = 'active' | 'disabled';

export interface IntegrationProfile {
  id: string;
  org_id: string;
  agent_id: string;
  email: string;
  app_name: string;
  webhook_url: string | null;
  allowed_origins: string[];
  status: IntegrationStatus;
}

interface ExistingIntegrationProfileSecret {
  id: string;
  webhook_secret_encrypted: string | null;
}

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'integration';
}

function buildApiKey() {
  return `dsg_live_${randomUUID().replace(/-/g, '')}`;
}

function hashApiKey(apiKey: string) {
  return createHash('sha256').update(apiKey).digest('hex');
}

function normalizeOrigins(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const items = value
    .map((item) => {
      if (!item) return null;

      try {
        const parsed = new URL(String(item));
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          return null;
        }

        return parsed.origin;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as string[];

  return Array.from(new Set(items));
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === 'metadata.google.internal'
  ) {
    return true;
  }

  if (isIP(host) === 4) {
    const [a, b] = host.split('.').map((part) => Number(part));
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }

  if (isIP(host) === 6) {
    return (
      host === '::1' ||
      host.startsWith('fc') ||
      host.startsWith('fd') ||
      host.startsWith('fe80:')
    );
  }

  return false;
}

function validateWebhookUrl(parsedWebhook: URL) {
  if (process.env.NODE_ENV === 'production' && parsedWebhook.protocol !== 'https:') {
    throw new Error('webhook_url must use https in production');
  }

  if (parsedWebhook.protocol !== 'https:' && parsedWebhook.protocol !== 'http:') {
    throw new Error('webhook_url must use http or https');
  }

  if (isPrivateOrLocalHostname(parsedWebhook.hostname)) {
    throw new Error('webhook_url must not point to localhost, private IP, or metadata services');
  }
}

export async function provisionIntegration(input: {
  email: string;
  appName: string;
}) {
  const email = String(input.email || '').trim().toLowerCase();
  const appName = String(input.appName || '').trim();

  if (!email || !email.includes('@')) {
    throw new Error('A valid email is required');
  }

  if (!appName || appName.length < 2 || appName.length > 80) {
    throw new Error('app_name must be between 2 and 80 characters');
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const orgId = `org_${randomUUID().replace(/-/g, '')}`;
  const slug = `${normalizeSlug(appName)}-${orgId.slice(-8)}`;
  const policyId = await resolveQuickstartPolicyId(orgId);

  if (!policyId) {
    throw new Error('No active policy is available');
  }

  const { error: orgError } = await supabase.from('organizations').insert({
    id: orgId,
    name: appName,
    slug,
    plan: 'trial',
    status: 'active',
    created_at: now,
    updated_at: now,
  });

  if (orgError) {
    throw orgError;
  }

  const apiKey = buildApiKey();
  const apiKeyHash = hashApiKey(apiKey);
  const agentId = `agt_${randomUUID().replace(/-/g, '')}`;

  const { error: agentError } = await supabase.from('agents').insert({
    id: agentId,
    org_id: orgId,
    name: `${appName} Agent`,
    policy_id: policyId,
    status: 'active',
    monthly_limit: 10000,
    api_key_hash: apiKeyHash,
    created_at: now,
    updated_at: now,
  });

  if (agentError) {
    throw agentError;
  }

  const { error: profileError } = await (supabase as any).from('integration_profiles').insert({
    id: `int_${randomUUID().replace(/-/g, '')}`,
    org_id: orgId,
    agent_id: agentId,
    email,
    app_name: appName,
    webhook_url: null,
    allowed_origins: [],
    status: 'active',
    created_at: now,
    updated_at: now,
  });

  if (profileError) {
    throw profileError;
  }

  return {
    orgId,
    agentId,
    apiKey,
  };
}

export async function resolveIntegrationFromApiKey(input: {
  agentId: string;
  apiKey: string;
}) {
  const agentId = String(input.agentId || '').trim();
  const apiKey = String(input.apiKey || '').trim();
  if (!agentId || !apiKey) return null;

  const apiKeyHash = hashApiKey(apiKey);
  const supabase = getSupabaseAdmin();

  const { data: agent, error } = await supabase
    .from('agents')
    .select('id, org_id, status')
    .eq('id', agentId)
    .eq('api_key_hash', apiKeyHash)
    .maybeSingle();

  if (error || !agent || agent.status !== 'active') {
    return null;
  }

  return {
    orgId: String(agent.org_id),
    agentId: String(agent.id),
  };
}

export async function upsertIntegrationWebhook(input: {
  orgId: string;
  agentId: string;
  webhookUrl: string;
  allowedOrigins?: unknown;
}) {
  const orgId = String(input.orgId || '').trim();
  const agentId = String(input.agentId || '').trim();
  const webhookUrl = String(input.webhookUrl || '').trim();
  const allowedOrigins = normalizeOrigins(input.allowedOrigins);

  if (!orgId || !agentId) {
    throw new Error('org_id and agent_id are required');
  }

  let parsedWebhook: URL;
  try {
    parsedWebhook = new URL(webhookUrl);
  } catch {
    throw new Error('webhook_url must be a valid URL');
  }

  validateWebhookUrl(parsedWebhook);

  const now = new Date().toISOString();
  const supabase = getSupabaseAdmin();

  const { data: existing } = await (supabase as any)
    .from('integration_profiles')
    .select('id, webhook_secret_encrypted')
    .eq('agent_id', agentId)
    .maybeSingle();

  const existingProfile = existing as ExistingIntegrationProfileSecret | null;
  let secret: string | null = null;
  let secretEncrypted = existingProfile?.webhook_secret_encrypted ?? null;

  if (!secretEncrypted) {
    const generated = generateWebhookSecret();
    secret = generated.secret;
    secretEncrypted = generated.secretEncrypted;
  }

  const payload = {
    org_id: orgId,
    agent_id: agentId,
    webhook_url: parsedWebhook.toString(),
    allowed_origins: allowedOrigins,
    status: 'active',
    webhook_secret_encrypted: secretEncrypted,
    updated_at: now,
  };

  const { data, error } = await (supabase as any)
    .from('integration_profiles')
    .upsert(payload, { onConflict: 'agent_id' })
    .select('id, org_id, agent_id, email, app_name, webhook_url, allowed_origins, status')
    .single();

  if (error || !data) {
    throw error || new Error('Failed to persist integration webhook');
  }

  return {
    profile: data as IntegrationProfile,
    secret,
    secret_returned: Boolean(secret),
  };
}

export async function getGlobalAllowedOrigins() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await (supabase as any)
    .from('integration_profiles')
    .select('allowed_origins')
    .eq('status', 'active');

  if (error || !data) {
    return [];
  }

  const allOrigins = data.flatMap((row) => normalizeOrigins(row.allowed_origins));
  return Array.from(new Set(allOrigins));
}
