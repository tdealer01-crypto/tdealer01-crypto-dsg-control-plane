import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { isStripeInstallMode } from "@/lib/stripe-app/oauth-config";
import { deauthorizeStripeAccount } from "@/lib/stripe-app/deauthorize";

const CONNECTED_COOKIES = [
  "dsg_stripe_connected",
  "dsg_stripe_account_id",
  "dsg_stripe_connected_mode",
  "dsg_stripe_connected_at",
];

export async function POST(request: NextRequest) {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const submittedAccountId = formData.get("stripe_account_id");
  if (typeof submittedAccountId !== "string" || !submittedAccountId.startsWith("acct_")) {
    return NextResponse.json({ error: "valid_stripe_account_id_required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin() as any;
  const { data: memberships, error: membershipError } = await supabase
    .from("org_members")
    .select("org_id, organization_id")
    .eq("user_id", user.id);
  if (membershipError) return NextResponse.json({ error: "membership_lookup_failed" }, { status: 503 });

  const orgIds = (memberships ?? [])
    .map((membership: { org_id?: string; organization_id?: string }) => membership.org_id || membership.organization_id)
    .filter(Boolean);
  if (orgIds.length === 0) return NextResponse.json({ error: "organization_membership_required" }, { status: 403 });

  const { data: account, error: accountError } = await supabase
    .from("stripe_app_accounts")
    .select("stripe_account_id, status, metadata")
    .eq("stripe_account_id", submittedAccountId)
    .in("dsg_org_id", orgIds)
    .maybeSingle();
  if (accountError) return NextResponse.json({ error: "connected_account_lookup_failed" }, { status: 503 });
  if (!account || account.status !== "active") return NextResponse.json({ error: "active_connected_account_not_found" }, { status: 404 });

  const mode = account.metadata?.install_mode;
  if (!isStripeInstallMode(mode)) return NextResponse.json({ error: "connected_account_mode_unknown" }, { status: 409 });

  try {
    await deauthorizeStripeAccount(mode, submittedAccountId);
  } catch (error) {
    console.error("[stripe-app/disconnect] Stripe OAuth deauthorization failed:", error);
    return NextResponse.json({ error: "stripe_deauthorization_failed" }, { status: 502 });
  }

  const disconnectedAt = new Date().toISOString();
  const { error } = await supabase
    .from("stripe_app_accounts")
    .update({ status: "inactive", disconnected_at: disconnectedAt, disconnect_reason: "manual_disconnect", updated_at: disconnectedAt })
    .eq("stripe_account_id", submittedAccountId)
    .in("dsg_org_id", orgIds)
    .eq("status", "active");
  if (error) return NextResponse.json({ error: "disconnect_persist_failed" }, { status: 503 });

  const response = NextResponse.redirect(new URL("/dashboard/stripe-app?disconnected=true", request.url), { status: 303 });
  for (const cookie of CONNECTED_COOKIES) response.cookies.delete(cookie);
  return response;
}
