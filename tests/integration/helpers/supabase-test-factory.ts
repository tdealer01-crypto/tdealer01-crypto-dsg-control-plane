import { createHash, randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Json = Record<string, unknown>;

export type SupabaseTestFixture = {
  orgId: string;
  policyId: string;
  agentId: string;
  apiKey: string;
  apiKeyHash: string;
  billingPeriod: string;
};

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseTestAdmin(): SupabaseClient {
  return createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-application-name': 'dsg-vitest-live-db-tests',
      },
    },
  });
}

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

export function makeTestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

export function currentBillingPeriod(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

async function ignoreMissingTable<T>(operation: PromiseLike<{ data: T; error: unknown }>) {
  const result = await operation;
  const message = String((result.error as { message?: string } | null)?.message || '').toLowerCase();
  if (result.error && !message.includes('does not exist') && !message.includes('schema cache')) {
    throw result.error;
  }
  return result.data;
}

export async function createExecutionFixture(
  supabase = getSupabaseTestAdmin(),
  overrides: Partial<SupabaseTestFixture> = {},
): Promise<SupabaseTestFixture> {
  // The live DB uses uuid primary keys for these tables (the checked-in
  // migrations still say text — live schema wins). UUID strings also satisfy
  // text columns, so generate UUIDs; the test marker lives in name/slug.
  const orgId = overrides.orgId ?? randomUUID();
  const policyId = overrides.policyId ?? randomUUID();
  const agentId = overrides.agentId ?? randomUUID();
  const apiKey = overrides.apiKey ?? `sk_test_${randomUUID().replaceAll('-', '')}`;
  const apiKeyHash = hashApiKey(apiKey);
  const billingPeriod = overrides.billingPeriod ?? currentBillingPeriod();

  await assertOk(
    supabase.from('organizations').upsert({
      id: orgId,
      name: `Integration Test Org ${orgId}`,
      slug: orgId,
      plan: 'trial',
      status: 'active',
    }),
    'insert organization',
  );

  await assertOk(
    supabase.from('policies').upsert({
      id: policyId,
      org_id: orgId,
      name: `Integration Test Policy ${policyId}`,
      version: 'v1',
      status: 'active',
      rules: {},
      config: {},
      is_active: true,
    }),
    'insert policy',
  );

  await assertOk(
    supabase.from('agents').upsert({
      id: agentId,
      org_id: orgId,
      name: `Integration Test Agent ${agentId}`,
      policy_id: policyId,
      status: 'active',
      monthly_limit: 1000,
      api_key_hash: apiKeyHash,
    }),
    'insert agent',
  );

  return { orgId, policyId, agentId, apiKey, apiKeyHash, billingPeriod };
}

export async function cleanupExecutionFixture(
  fixture: Pick<SupabaseTestFixture, 'orgId' | 'agentId' | 'policyId'>,
  supabase = getSupabaseTestAdmin(),
) {
  await ignoreMissingTable(supabase.from('usage_events').delete().eq('org_id', fixture.orgId));
  await ignoreMissingTable(supabase.from('usage_counters').delete().eq('org_id', fixture.orgId));
  await ignoreMissingTable(supabase.from('audit_logs').delete().eq('org_id', fixture.orgId));
  await ignoreMissingTable(supabase.from('executions').delete().eq('org_id', fixture.orgId));
  await ignoreMissingTable(supabase.from('runtime_truth_states').delete().eq('org_id', fixture.orgId));
  await ignoreMissingTable(supabase.from('runtime_approval_requests').delete().eq('org_id', fixture.orgId));
  await ignoreMissingTable(supabase.from('billing_subscriptions').delete().eq('org_id', fixture.orgId));
  await ignoreMissingTable(supabase.from('billing_customers').delete().eq('org_id', fixture.orgId));
  await ignoreMissingTable(supabase.from('agents').delete().eq('id', fixture.agentId));
  await ignoreMissingTable(supabase.from('policies').delete().eq('id', fixture.policyId));
  await ignoreMissingTable(supabase.from('organizations').delete().eq('id', fixture.orgId));
}

export async function assertOk<T>(
  operation: PromiseLike<{ data: T; error: unknown }>,
  label: string,
): Promise<T> {
  const { data, error } = await operation;
  if (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    throw new Error(`${label} failed: ${message}`);
  }
  return data;
}

export async function assertTableExists(supabase: SupabaseClient, table: string) {
  const { error } = await supabase.from(table).select('*').limit(1);
  if (error) {
    throw new Error(`Required table is not queryable: ${table}. ${error.message}`);
  }
}

export async function countRows(
  supabase: SupabaseClient,
  table: string,
  filters: Json,
): Promise<number> {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value as string | number | boolean);
  }
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}
