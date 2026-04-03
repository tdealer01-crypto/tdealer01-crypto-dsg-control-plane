import { NextResponse } from "next/server";
import { getOverageRateUsd, INCLUDED_EXECUTIONS } from '../../../lib/billing/overage-config';
import { requireOrgRole } from "../../../lib/authz";
import { RuntimeRouteRoles } from "../../../lib/runtime/permissions";
import { getSupabaseAdmin } from "../../../lib/supabase-server";
import { internalErrorMessage, logApiError } from "../../../lib/security/api-error";

export const dynamic = "force-dynamic";


export async function GET() {
  try {
    const access = await requireOrgRole(RuntimeRouteRoles.usage_read);
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
      (sum, row: any) => sum + Number(row.executions || 0),
      0
    );

    const planKey = String(subscription?.plan_key || "trial").toLowerCase();
    const included = INCLUDED_EXECUTIONS[planKey] || INCLUDED_EXECUTIONS.trial;
    const remaining = Math.max(0, included - executions);
    const utilization = included > 0 ? Number((executions / included).toFixed(4)) : 0;
    const overage = Math.max(0, executions - included);
    const projectedAmountUsd = Number((overage * getOverageRateUsd()).toFixed(3));

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
