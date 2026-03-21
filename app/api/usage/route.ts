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
    const supabase = createClient();

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

    const billing_period = currentBillingPeriod();

    const { data: usageData } = await supabase
      .from("usage")
      .select("executions")
      .eq("org_id", profile.org_id)
      .eq("billing_period", billing_period);

    const executions =
      usageData?.reduce((sum, row) => sum + (row.executions || 0), 0) || 0;

    const included_executions = 10000;
    const overage_executions = Math.max(0, executions - included_executions);
    const projected_amount_usd = 99; // placeholder pricing

    return NextResponse.json({
      plan: "pro",
      billing_period,
      executions,
      included_executions,
      overage_executions,
      projected_amount_usd,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
