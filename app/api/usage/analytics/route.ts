/**
 * Real-Time Usage Analytics API
 *
 * Returns org-level usage metrics for the dashboard and upgrade nudge UI.
 * Powers the "you've used X% of your quota" banner in the frontend.
 *
 * GET /api/usage/analytics
 * GET /api/usage/analytics?period=2026-05  (specific billing period)
 */

import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { getOrgUsageSnapshot, normalizeBillingPeriod } from '../../../../lib/revenue/upgrade-nudge';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { handleApiError } from '../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, 'usage-analytics'),
      limit: 60,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: buildRateLimitHeaders(rateLimit, 60) }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from('users')
      .select('org_id, is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile?.is_active || !profile?.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const requestedPeriod = searchParams.get('period');
    const period          = normalizeBillingPeriod(requestedPeriod);

    // Get requested period snapshot (includes nudge level)
    const snapshot = await getOrgUsageSnapshot(profile.org_id, period);

    // Get historical usage for trend chart (last 6 months)
    const { data: history } = await admin
      .from('usage_counters')
      .select('billing_period, executions, agent_id')
      .eq('org_id', profile.org_id)
      .gte('billing_period', getPeriodMonthsAgo(6))
      .order('billing_period', { ascending: true });

    // Aggregate history by period
    const periodTotals = new Map<string, number>();
    for (const row of history ?? []) {
      periodTotals.set(
        row.billing_period,
        (periodTotals.get(row.billing_period) ?? 0) + (row.executions ?? 0)
      );
    }

    // Top agents by usage in requested period
    const { data: agentUsage } = await admin
      .from('usage_counters')
      .select('agent_id, executions')
      .eq('org_id', profile.org_id)
      .eq('billing_period', period)
      .order('executions', { ascending: false })
      .limit(10);

    return NextResponse.json({
      ok: true,
      period,
      quota: {
        plan:         snapshot.plan,
        used:         snapshot.used,
        limit:        snapshot.limit,
        remaining:    snapshot.limit - snapshot.used,
        pct:          snapshot.pct,
        nudge:        snapshot.nudge,
        upgradeUrl:   snapshot.nudge !== 'none' ? snapshot.upgradeUrl : null,
        nextPlan:     snapshot.nextPlan,
        nextPlanQuota: snapshot.nextPlanQuota,
      },
      history: [...periodTotals.entries()].map(([p, executions]) => ({
        period: p,
        executions,
      })),
      topAgents: (agentUsage ?? []).map(r => ({
        agentId:    r.agent_id,
        executions: r.executions ?? 0,
      })),
    }, { headers: buildRateLimitHeaders(rateLimit, 60) });
  } catch (error) {
    return handleApiError('api/usage/analytics', error);
  }
}

function getPeriodMonthsAgo(months: number): string {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - months);
  const yyyy = d.getUTCFullYear();
  const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}
