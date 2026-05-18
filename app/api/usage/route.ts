import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { getOverageRateUsd, INCLUDED_EXECUTIONS } from '../../../lib/billing/overage-config';
import { requireRuntimeAccess } from '../../../lib/authz-runtime';
import { internalErrorMessage, logApiError } from '../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

type WarningItem = { level: 'warning' | 'error'; code: string; stage: string; message: string };

function isSupabaseSchemaDriftError(error: unknown) {
  const message = String((error as { message?: unknown })?.message || '').toLowerCase();
  return (
    message.includes('pgrst') ||
    message.includes('schema cache') ||
    message.includes('undefined table') ||
    message.includes('does not exist') ||
    message.includes('relation') ||
    message.includes('could not find') ||
    message.includes('function')
  );
}

function formatPlanLabel(planKey?: string | null, interval?: string | null) {
  const normalized = String(planKey || 'trial').toLowerCase();
  const pretty = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();

  if (!interval) return pretty;
  return `${pretty} (${interval})`;
}

function formatBillingPeriod(start?: string | null, end?: string | null, fallback?: string) {
  if (start && end) {
    return `${String(start).slice(0, 10)} → ${String(end).slice(0, 10)}`;
  }

  return fallback || new Date().toISOString().slice(0, 7);
}

export async function GET(request: Request) {
  try {
    const access = await requireRuntimeAccess(request, 'usage_read');
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = getSupabaseAdmin();
    const warnings: WarningItem[] = [];

    const { data: subscription, error: subscriptionError } = await supabase
      .from('billing_subscriptions')
      .select(
        'org_id, plan_key, billing_interval, status, current_period_start, current_period_end, trial_end, updated_at'
      )
      .eq('org_id', access.orgId)
      .in('status', ['trialing', 'active', 'past_due', 'unpaid', 'canceled'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      logApiError('api/usage', subscriptionError, { stage: 'subscription-query' });
      if (isSupabaseSchemaDriftError(subscriptionError)) {
        warnings.push({
          level: 'warning',
          code: 'SUBSCRIPTION_UNAVAILABLE',
          stage: 'subscription-query',
          message: 'Billing subscription unavailable (schema drift or missing relation).',
        });
      } else {
        return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
      }
    }

    const billingPeriodKey = subscription?.current_period_start
      ? String(subscription.current_period_start).slice(0, 7)
      : new Date().toISOString().slice(0, 7);

    const { data: usageCounters, error: usageError } = await supabase
      .from('usage_counters')
      .select('executions')
      .eq('org_id', access.orgId)
      .eq('billing_period', billingPeriodKey);

    if (usageError) {
      logApiError('api/usage', usageError, { stage: 'usage-counter-query' });
      if (isSupabaseSchemaDriftError(usageError)) {
        warnings.push({
          level: 'warning',
          code: 'USAGE_COUNTERS_UNAVAILABLE',
          stage: 'usage-counter-query',
          message: 'Usage counters unavailable (schema drift or missing relation).',
        });
      } else {
        return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
      }
    }

    const executions = usageError
      ? 0
      : (usageCounters || []).reduce((sum, row) => sum + Number(row.executions || 0), 0);

    const planKey = String(subscription?.plan_key || 'trial').toLowerCase();
    const includedExecutions = INCLUDED_EXECUTIONS[planKey] || INCLUDED_EXECUTIONS.trial;

    const overageExecutions = Math.max(0, executions - includedExecutions);
    const projectedAmountUsd = Number((overageExecutions * getOverageRateUsd()).toFixed(3));

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
      warnings,
    });
  } catch (error) {
    logApiError('api/usage', error, { stage: 'unhandled' });
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}
