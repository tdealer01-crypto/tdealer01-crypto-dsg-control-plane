import { NextResponse } from 'next/server';
import { requireActiveProfile } from '@/lib/auth/require-active-profile';
import { requireInternalService } from '@/lib/auth/internal-service';
import {
  QUOTA_UPGRADE_OPTIONS,
  getQuotaUsage,
  getUserQuotaTier,
  isQuotaExhausted,
} from '@/lib/database/quotas';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

type ActiveKey = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  currentMonthlyUsage: number;
  nextBillingDate: string | null;
  status: string;
};

async function resolveQuotaAccess(request: Request): Promise<
  | { ok: true; orgId: string }
  | { ok: false; status: number; error: string }
> {
  const authHeader = request.headers.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const internal = requireInternalService(request);
    if (internal.ok) {
      return { ok: true, orgId: internal.orgId };
    }
    return internal;
  }

  const profile = await requireActiveProfile();
  if (!profile.ok) {
    return profile;
  }

  return { ok: true, orgId: profile.orgId };
}

async function listActiveKeys(orgId: string, nextBillingDate: string | null): Promise<ActiveKey[]> {
  const supabase = getSupabaseAdmin();
  const result = await (supabase as any)
    .from('api_keys')
    .select('id, name, prefix, created_at, requests_this_month, status')
    .eq('org_id', orgId)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return ((result.data || []) as Array<{
    id: string;
    name: string;
    prefix: string;
    created_at: string;
    requests_this_month?: number | null;
    status: string;
  }>).map((row) => ({
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    createdAt: row.created_at,
    currentMonthlyUsage: Number(row.requests_this_month || 0),
    nextBillingDate,
    status: row.status,
  }));
}

export async function GET(request: Request) {
  try {
    const access = await resolveQuotaAccess(request);
    if (access.ok === false) {
      return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
    }

    const searchParams = new URL(request.url).searchParams;
    const requestedPeriod = searchParams.get('period') || undefined;

    const tier = await getUserQuotaTier(access.orgId);
    const period = requestedPeriod || (tier.currentPeriodStart || new Date().toISOString()).slice(0, 7);
    const [usage, exhausted, activeKeys] = await Promise.all([
      getQuotaUsage(access.orgId, period),
      isQuotaExhausted(access.orgId),
      listActiveKeys(access.orgId, tier.currentPeriodEnd),
    ]);

    return NextResponse.json({
      ok: true,
      tier: {
        key: tier.planKey,
        billingInterval: tier.billingInterval,
        limit: tier.limit,
        status: tier.subscriptionStatus,
      },
      usage: {
        period: usage.period,
        used: usage.totalUsed,
        remaining: Math.max(0, tier.limit - usage.totalUsed),
        limit: tier.limit,
        resetDate: usage.resetDate,
        exhausted,
        breakdown: {
          deliveryProofScans: usage.deliveryProofScans,
          apiExecutions: usage.apiExecutions,
          mcpRequests: usage.mcpRequests,
        },
      },
      activeKeys,
      upgradeOptions: QUOTA_UPGRADE_OPTIONS,
    });
  } catch (error) {
    return handleApiError('api/quotas/usage:GET', error);
  }
}
