import { INCLUDED_EXECUTIONS } from '@/lib/billing/overage-config';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { insertRevenueEvent } from '@/lib/revenue/events';

export type QuotaUsageType = 'delivery_proof_scan' | 'api_execution' | 'mcp_request';

export type QuotaTier = {
  planKey: string;
  billingInterval: string | null;
  limit: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  subscriptionStatus: string;
};

export type QuotaUsageSummary = {
  period: string;
  periodStart: string;
  periodEnd: string;
  resetDate: string;
  apiExecutions: number;
  deliveryProofScans: number;
  mcpRequests: number;
  totalUsed: number;
};

export type QuotaUpgradeOption = {
  id: string;
  label: string;
  priceLabel: string;
  description: string;
};

type SubscriptionRow = {
  plan_key: string | null;
  billing_interval: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  status: string | null;
};

const DEFAULT_PLAN_KEY = 'trial';

export const QUOTA_UPGRADE_OPTIONS: QuotaUpgradeOption[] = [
  { id: 'pro', label: 'Pro', priceLabel: '$99/mo', description: '10,000 monthly executions and higher rate limits' },
  { id: 'business', label: 'Business', priceLabel: '$299/mo', description: '100,000 monthly executions with audit tooling' },
  { id: 'enterprise', label: 'Enterprise', priceLabel: '$799/mo', description: '1,000,000 monthly executions with enterprise support' },
];

function currentUtcMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function buildPeriodBounds(period: string, subscription?: Pick<QuotaTier, 'currentPeriodStart' | 'currentPeriodEnd'>): {
  periodStart: string;
  periodEnd: string;
  resetDate: string;
} {
  const [yearText, monthText] = period.split('-');
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return {
      periodStart: subscription?.currentPeriodStart || start.toISOString(),
      periodEnd: subscription?.currentPeriodEnd || end.toISOString(),
      resetDate: subscription?.currentPeriodEnd || end.toISOString(),
    };
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  return {
    periodStart: subscription?.currentPeriodStart || start.toISOString(),
    periodEnd: subscription?.currentPeriodEnd || end.toISOString(),
    resetDate: subscription?.currentPeriodEnd || end.toISOString(),
  };
}

export async function getUserQuotaTier(orgId: string): Promise<QuotaTier> {
  const supabase = getSupabaseAdmin();
  const result = await (supabase as any)
    .from('billing_subscriptions')
    .select('plan_key, billing_interval, current_period_start, current_period_end, status, updated_at')
    .eq('org_id', orgId)
    .in('status', ['trialing', 'active', 'past_due', 'unpaid', 'canceled'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  const row = (result.data || {}) as SubscriptionRow;
  const planKey = String(row.plan_key || DEFAULT_PLAN_KEY).toLowerCase();

  return {
    planKey,
    billingInterval: row.billing_interval ?? null,
    limit: INCLUDED_EXECUTIONS[planKey] || INCLUDED_EXECUTIONS.trial,
    currentPeriodStart: row.current_period_start ?? null,
    currentPeriodEnd: row.current_period_end ?? null,
    subscriptionStatus: row.status || 'trialing',
  };
}

export async function getQuotaUsage(orgId: string, period = currentUtcMonth()): Promise<QuotaUsageSummary> {
  const supabase = getSupabaseAdmin();
  const tier = await getUserQuotaTier(orgId);
  const bounds = buildPeriodBounds(period, tier);

  const [usageCountersResult, revenueEventsResult, apiKeysResult] = await Promise.all([
    (supabase as any)
      .from('usage_counters')
      .select('executions')
      .eq('org_id', orgId)
      .eq('billing_period', period),
    (supabase as any)
      .from('revenue_events')
      .select('event_type, amount')
      .eq('org_id', orgId)
      .gte('created_at', bounds.periodStart)
      .lt('created_at', bounds.periodEnd),
    (supabase as any)
      .from('api_keys')
      .select('requests_this_month')
      .eq('org_id', orgId)
      .eq('status', 'ACTIVE'),
  ]);

  if (usageCountersResult.error) {
    throw new Error(usageCountersResult.error.message);
  }
  if (revenueEventsResult.error) {
    throw new Error(revenueEventsResult.error.message);
  }
  if (apiKeysResult.error) {
    throw new Error(apiKeysResult.error.message);
  }

  const apiExecutions = ((usageCountersResult.data || []) as Array<{ executions?: number | null }>)
    .reduce((sum, row) => sum + Number(row.executions || 0), 0);

  const deliveryProofScans = ((revenueEventsResult.data || []) as Array<{ event_type?: string | null; amount?: number | string | null }>)
    .filter((row) => row.event_type === 'delivery_proof_scan')
    .reduce((sum, row) => sum + Number(row.amount || 1), 0);

  const apiKeyUsage = ((apiKeysResult.data || []) as Array<{ requests_this_month?: number | null }>)
    .reduce((sum, row) => sum + Number(row.requests_this_month || 0), 0);

  const mcpRequestsFromEvents = ((revenueEventsResult.data || []) as Array<{ event_type?: string | null; amount?: number | string | null }>)
    .filter((row) => row.event_type === 'mcp_request')
    .reduce((sum, row) => sum + Number(row.amount || 1), 0);

  const mcpRequests = Math.max(apiKeyUsage, mcpRequestsFromEvents);

  return {
    period,
    periodStart: bounds.periodStart,
    periodEnd: bounds.periodEnd,
    resetDate: bounds.resetDate,
    apiExecutions,
    deliveryProofScans,
    mcpRequests,
    totalUsed: apiExecutions + deliveryProofScans + mcpRequests,
  };
}

export async function isQuotaExhausted(orgId: string): Promise<boolean> {
  const tier = await getUserQuotaTier(orgId);
  const period = (tier.currentPeriodStart || currentUtcMonth()).slice(0, 7);
  const usage = await getQuotaUsage(orgId, period);
  return usage.totalUsed >= tier.limit;
}

export async function logQuotaConsumption(
  orgId: string,
  type: QuotaUsageType,
  amount: number,
  options?: { userId?: string | null; planId?: string | null; source?: string; metadata?: Record<string, unknown> | null }
) {
  return insertRevenueEvent({
    orgId,
    userId: options?.userId ?? null,
    planId: options?.planId ?? null,
    eventType: type,
    amount,
    currency: 'USD',
    source: options?.source || `quota:${type}`,
    metadata: {
      quotaType: type,
      ...(options?.metadata || {}),
    },
  });
}
