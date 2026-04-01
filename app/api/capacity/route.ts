import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { getOverageRateUsd, INCLUDED_EXECUTIONS } from '../../../lib/billing/overage-config';

export const dynamic = "force-dynamic";


export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("org_id, is_active")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError || !profile?.org_id || !profile.is_active) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from("billing_subscriptions")
      .select("plan_key, billing_interval, status, current_period_start, current_period_end")
      .eq("org_id", profile.org_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      return NextResponse.json({ error: subscriptionError.message }, { status: 500 });
    }

    const periodKey = subscription?.current_period_start
      ? String(subscription.current_period_start).slice(0, 7)
      : new Date().toISOString().slice(0, 7);

    const { data: counters, error: counterError } = await supabase
      .from("usage_counters")
      .select("executions")
      .eq("org_id", profile.org_id)
      .eq("billing_period", periodKey);

    if (counterError) {
      return NextResponse.json({ error: counterError.message }, { status: 500 });
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
