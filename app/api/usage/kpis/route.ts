import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { handleApiError } from '../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

const REVENUE_COUNTING_STATUSES = new Set(['active', 'past_due', 'unpaid']);
const TRIAL_START_STATUSES = new Set(['trialing']);
const DEFAULT_WINDOW_DAYS = 30;
const MAX_WINDOW_DAYS = 90;
const YEARLY_DISCOUNT_MULTIPLIER = 0.8;
const BILLING_EVENTS_LOOKBACK_DAYS = 56;

const PLAN_PRICE_MONTHLY: Record<string, number> = {
  pro: 99,
  business: 299,
  enterprise: 799,
  finance_skills: 199,
  dev_skills: 99,
  compliance_skills: 249,
  ops_skills: 149,
  enterprise_skills: 599,
};

function parseWindowDays(value: string | null): number {
  const n = Number(value || DEFAULT_WINDOW_DAYS);
  if (!Number.isFinite(n)) return DEFAULT_WINDOW_DAYS;
  return Math.min(MAX_WINDOW_DAYS, Math.max(7, Math.floor(n)));
}

function parseIso(value: string | null | undefined): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

function startOfIsoWeek(input: Date): string {
  const d = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

function toMonthlyAmount(planKey: string | null, interval: string | null): number {
  const base = PLAN_PRICE_MONTHLY[String(planKey || '').toLowerCase()] || 0;
  return String(interval || '').toLowerCase() === 'yearly'
    ? Number((base * YEARLY_DISCOUNT_MULTIPLIER).toFixed(2))
    : base;
}

export async function GET(request: Request) {
  try {
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, 'usage-kpis'),
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: buildRateLimitHeaders(rateLimit, 60) });
    }

    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from('users')
      .select('org_id, is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile?.is_active || !profile?.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: buildRateLimitHeaders(rateLimit, 60) });
    }

    const searchParams = new URL(request.url).searchParams;
    const windowDays = parseWindowDays(searchParams.get('days'));
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - windowDays);
    const startIso = start.toISOString();

    const [{ data: recentSubs }, { data: activeSubs }, { data: billingEvents }] = await Promise.all([
      admin
        .from('billing_subscriptions')
        .select('status, plan_key, billing_interval, created_at, updated_at, trial_start')
        .eq('org_id', profile.org_id)
        .gte('created_at', startIso),
      admin
        .from('billing_subscriptions')
        .select('status, plan_key, billing_interval, created_at')
        .eq('org_id', profile.org_id),
      admin
        .from('billing_events')
        .select('event_type, created_at, processed_at')
        .eq('org_id', profile.org_id)
        .gte(
          'created_at',
          new Date(Date.now() - Math.max(windowDays, BILLING_EVENTS_LOOKBACK_DAYS) * 24 * 60 * 60 * 1000).toISOString()
        ),
    ]);

    const recent = recentSubs || [];
    const allSubs = activeSubs || [];
    const events = billingEvents || [];

    const trialStarts = recent.filter((row) => TRIAL_START_STATUSES.has(String(row.status || '').toLowerCase())).length;
    const paidActivationsFromTrial = recent.filter((row) => {
      const status = String(row.status || '').toLowerCase();
      const trialStart = parseIso(row.trial_start);
      return REVENUE_COUNTING_STATUSES.has(status) && trialStart >= Date.parse(startIso);
    }).length;

    const activeRows = allSubs.filter((row) => REVENUE_COUNTING_STATUSES.has(String(row.status || '').toLowerCase()));
    const mrrUsd = Number(activeRows.reduce((sum, row) => sum + toMonthlyAmount(row.plan_key, row.billing_interval), 0).toFixed(2));
    const activeCount = activeRows.length;
    const canceledWindow = recent.filter((row) => String(row.status || '').toLowerCase() === 'canceled').length;
    const activeAtPeriodStart = allSubs.filter((row) => {
      const status = String(row.status || '').toLowerCase();
      return REVENUE_COUNTING_STATUSES.has(status) && parseIso(row.created_at) < Date.parse(startIso);
    }).length;

    const checkoutCompleted = events.filter((row) => row.event_type === 'checkout.session.completed').length;
    const checkoutExpired = events.filter((row) => row.event_type === 'checkout.session.expired').length;
    const checkoutAttempts = checkoutCompleted + checkoutExpired;

    const weekly = new Map<string, { checkout_completed: number; checkout_expired: number; paid_activations: number; churned: number }>();
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i * 7);
      weekly.set(startOfIsoWeek(d), { checkout_completed: 0, checkout_expired: 0, paid_activations: 0, churned: 0 });
    }

    for (const row of events) {
      const eventType = String(row.event_type || '');
      const ts = parseIso(row.processed_at || row.created_at);
      if (!ts) continue;
      const key = startOfIsoWeek(new Date(ts));
      const bucket = weekly.get(key);
      if (!bucket) continue;
      if (eventType === 'checkout.session.completed') bucket.checkout_completed += 1;
      if (eventType === 'checkout.session.expired') bucket.checkout_expired += 1;
    }

    for (const row of recent) {
      const status = String(row.status || '').toLowerCase();
      const ts = parseIso(row.updated_at || row.created_at);
      if (!ts) continue;
      const key = startOfIsoWeek(new Date(ts));
      const bucket = weekly.get(key);
      if (!bucket) continue;
      if (REVENUE_COUNTING_STATUSES.has(status)) bucket.paid_activations += 1;
      if (status === 'canceled') bucket.churned += 1;
    }

    return NextResponse.json({
      ok: true,
      window_days: windowDays,
      metrics: {
        trial_to_paid_conversion_pct: trialStarts > 0
          ? Number(((paidActivationsFromTrial / trialStarts) * 100).toFixed(2))
          : null,
        mrr_usd: mrrUsd,
        churn_rate_pct: activeAtPeriodStart > 0
          ? Number(((canceledWindow / activeAtPeriodStart) * 100).toFixed(2))
          : null,
        arpa_usd: activeCount > 0 ? Number((mrrUsd / activeCount).toFixed(2)) : null,
        checkout_completion_rate_pct: checkoutAttempts > 0 ? Number(((checkoutCompleted / checkoutAttempts) * 100).toFixed(2)) : null,
        active_subscriptions: activeCount,
        canceled_subscriptions_window: canceledWindow,
      },
      weekly_funnel: [...weekly.entries()].map(([week_start, values]) => ({ week_start, ...values })),
    }, { headers: buildRateLimitHeaders(rateLimit, 60) });
  } catch (error) {
    return handleApiError('api/usage/kpis', error);
  }
}
