import { NextResponse } from 'next/server';
import { getOverageRateUsd, INCLUDED_EXECUTIONS } from '../../../lib/billing/overage-config';
import { requireRuntimeAccess } from '../../../lib/authz-runtime';
import { getSupabaseAdmin } from "../../../lib/supabase-server";
import { internalErrorMessage, logApiError } from "../../../lib/security/api-error";
import { sendQuotaAlert } from "../../../lib/email/sales";

const QUOTA_ALERT_THRESHOLDS = [0.8, 1.0] as const;

export const dynamic = "force-dynamic";


export async function GET(request: Request) {
  try {
    const access = await requireRuntimeAccess(request, 'usage_read');
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const supabase = getSupabaseAdmin();

    const { data: subscription, error: subscriptionError } = await supabase
      .from("billing_subscriptions")
      .select("plan_key, billing_interval, status, current_period_start, current_period_end")
      .eq("org_id", access.orgId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      logApiError("api/capacity", subscriptionError, { stage: "subscription-query" });
      return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
    }

    const periodKey = subscription?.current_period_start
      ? String(subscription.current_period_start).slice(0, 7)
      : new Date().toISOString().slice(0, 7);

    const { data: counters, error: counterError } = await supabase
      .from("usage_counters")
      .select("executions")
      .eq("org_id", access.orgId)
      .eq("billing_period", periodKey);

    if (counterError) {
      logApiError("api/capacity", counterError, { stage: "counter-query" });
      return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
    }

    const executions = (counters || []).reduce(
      (sum, row: { executions: number | null }) => sum + Number(row.executions || 0),
      0
    );

    const planKey = String(subscription?.plan_key || "trial").toLowerCase();
    const included = INCLUDED_EXECUTIONS[planKey] || INCLUDED_EXECUTIONS.trial;
    const remaining = Math.max(0, included - executions);
    const utilization = included > 0 ? Number((executions / included).toFixed(4)) : 0;
    const overage = Math.max(0, executions - included);
    const projectedAmountUsd = Number((overage * getOverageRateUsd()).toFixed(3));

    // Fire quota alert email (once per threshold per billing period, cooldown via billing_events)
    for (const threshold of QUOTA_ALERT_THRESHOLDS) {
      if (utilization >= threshold) {
        const alertEventId = `quota-alert-${access.orgId}-${periodKey}-${threshold}`;
        const { data: existing } = await supabase
          .from('billing_events')
          .select('stripe_event_id')
          .eq('stripe_event_id', alertEventId)
          .maybeSingle();
        if (!existing) {
          // Look up org admin email
          const { data: user } = await supabase
            .from('users')
            .select('email')
            .eq('org_id', access.orgId)
            .limit(1)
            .maybeSingle();
          if (user?.email) {
            void sendQuotaAlert({ email: user.email, planKey, executions, included, utilization });
          }
          void supabase.from('billing_events').insert({
            stripe_event_id: alertEventId,
            event_type: `quota_alert_${Math.round(threshold * 100)}`,
            stripe_customer_id: null,
            stripe_subscription_id: null,
            payload: { org_id: access.orgId, period: periodKey, threshold } as unknown as import('../../../lib/database.types').Json,
            processed_at: new Date().toISOString(),
          }).then(() => null, () => null);
        }
        break; // alert only the highest crossed threshold
      }
    }

    return NextResponse.json({
      ok: true,
      plan_key: planKey,
      billing_interval: subscription?.billing_interval || "monthly",
      subscription_status: subscription?.status || "trialing",
      current_period_start: subscription?.current_period_start || null,
      current_period_end: subscription?.current_period_end || null,
      billing_period: periodKey,
      executions,
      included_executions: included,
      remaining_executions: remaining,
      utilization,
      overage_executions: overage,
      projected_amount_usd: projectedAmountUsd,
    });
  } catch (error) {
    logApiError("api/capacity", error, { stage: "unhandled" });
    return NextResponse.json(
      { error: internalErrorMessage() },
      { status: 500 }
    );
  }
}
