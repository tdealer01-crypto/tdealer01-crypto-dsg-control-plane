import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

function currentBillingPeriod() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { claims },
      error: claimsError,
    } = await supabase.auth.getClaims();

    if (claimsError || !claims?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("org_id, is_active")
      .eq("auth_user_id", claims.sub)
      .maybeSingle();

    if (profileError || !profile?.org_id || !profile.is_active) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const billingPeriod = currentBillingPeriod();

    const [{ count: agentCount, error: agentCountError }, { count: executionCount, error: executionCountError }] =
      await Promise.all([
        supabase
          .from("agents")
          .select("*", { count: "exact", head: true })
          .eq("org_id", profile.org_id),
        supabase
          .from("executions")
          .select("*", { count: "exact", head: true })
          .eq("org_id", profile.org_id),
      ]);

    if (agentCountError) {
      return NextResponse.json({ error: agentCountError.message }, { status: 500 });
    }

    if (executionCountError) {
      return NextResponse.json({ error: executionCountError.message }, { status: 500 });
    }

    const { data: usageRows, error: usageError } = await supabase
      .from("usage_counters")
      .select("billing_period, executions, updated_at")
      .eq("org_id", profile.org_id)
      .eq("billing_period", billingPeriod);

    if (usageError) {
      return NextResponse.json({ error: usageError.message }, { status: 500 });
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("plan, status, current_period_start, current_period_end, updated_at")
      .eq("org_id", profile.org_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      return NextResponse.json({ error: subscriptionError.message }, { status: 500 });
    }

    const monthlyExecutions = (usageRows ?? []).reduce((sum, row) => {
      return sum + Number(row.executions || 0);
    }, 0);

    return NextResponse.json({
      ok: true,
      summary: {
        billing_period: billingPeriod,
        agent_count: agentCount ?? 0,
        execution_count: executionCount ?? 0,
        monthly_executions: monthlyExecutions,
        subscription: subscription ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
