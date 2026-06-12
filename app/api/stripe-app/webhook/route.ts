import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_APP_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "stripe_app_webhook_not_configured" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing_stripe_signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type !== "account.application.deauthorized") {
    return NextResponse.json({ received: true, handled: false });
  }

  const stripeAccountId = typeof event.account === "string" ? event.account : null;
  if (!stripeAccountId) return NextResponse.json({ error: "missing_stripe_account_id" }, { status: 400 });

  const disconnectedAt = new Date(event.created * 1000).toISOString();
  const supabase = getSupabaseAdmin() as any;
  const { data, error } = await supabase
    .from("stripe_app_accounts")
    .update({
      status: "revoked",
      disconnected_at: disconnectedAt,
      disconnect_reason: "account.application.deauthorized",
      last_lifecycle_event_id: event.id,
      updated_at: disconnectedAt,
    })
    .eq("stripe_account_id", stripeAccountId)
    .lte("installed_at", disconnectedAt)
    .select("stripe_account_id");

  if (error) {
    console.error("[stripe-app/webhook] Failed to persist deauthorization:", error.message);
    return NextResponse.json({ error: "deauthorization_persist_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true, handled: Boolean(data?.length) });
}
