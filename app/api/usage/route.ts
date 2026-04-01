import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { buildQuotaSummary } from '../../../lib/billing/quota-policy';

export const dynamic = 'force-dynamic';

const INCLUDED_EXECUTIONS: Record<string, number> = {
  trial: 1000,
  pro: 10000,
  business: 100000,
  enterprise: 1000000,
};

function formatPlanLabel(planKey?: string | null, interval?: string | null) {
  const normalized = String(planKey || 'trial').toLowerCase();
  const pretty =
    normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();

  if (!interval) return pretty;
  return `${pretty} (${interval})`;
}

function formatBillingPeriod(
  start?: string | null,
  end?: string | null,
  fallback?: string
) {
  if (start && end) {
    return `${String(start).slice(0, 10)} → ${String(end).slice(0, 10)}`;
  }

  return fallback || new Date().toISOString().slice(0, 7);
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('org_id, is_active')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (profileError || !profile?.org_id || !profile.is_active) {

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from('billing_subscriptions')
      .select(
        'org_id, plan_key, billing_interval, status, current_period_start, current_period_end, trial_end, updated_at'
      )
      .eq('org_id', profile.org_id)
      .in('status', ['trialing', 'active', 'past_due', 'unpaid', 'canceled'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      subscriptionError &&
      !/relation .* does not exist/i.test(subscriptionError.message)
    ) {
      return NextResponse.json(
        { error: subscriptionError.message },
        { status: 500 }
      );
    }

    const billingPeriodKey = subscription?.current_period_start
      ? String(subscription.current_period_start).slice(0, 7)
      : new Date().toISOString().slice(0, 7);

    const { data: usageCounters, error: usageError } = await supabase
      .from('usage_counters')
      .select('executions')
      .eq('org_id', profile.org_id)
      .eq('billing_period', billingPeriodKey);

    if (usageError) {

    return NextResponse.json({ error: usageError.message }, { status: 500 });
    }

    const executions = (usageCounters || []).reduce(
      (sum, row) => sum + Number(row.executions || 0),
      0
    );

    const planKey = String(subscription?.plan_key || 'trial').toLowerCase();
    const includedExecutions =
      INCLUDED_EXECUTIONS[planKey] || INCLUDED_EXECUTIONS.trial;

    const overageExecutions = Math.max(0, executions - includedExecutions);
    const projectedAmountUsd = Number((overageExecutions * 0.001).toFixed(3));
    const quota = buildQuotaSummary(planKey, executions);

    return NextResponse.json({
      plan: formatPlanLabel(planKey, subscription?.billing_interval || null),
      subscription_status: subscription?.status || 'trialing',
      billing_period: formatBillingPeriod(
        subscription?.current_period_start || null,
        subscription?.current_period_end || null,
        billingPeriodKey
      ),
      current_period_start: subscription?.current_period_start || null,
      current_period_end: subscription?.current_period_end || null,
      trial_end: subscription?.trial_end || null,
      executions,
      included_executions: includedExecutions,
      overage_executions: overageExecutions,
      projected_amount_usd: projectedAmountUsd,
      quota_summary: quota,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
