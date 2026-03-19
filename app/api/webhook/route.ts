import Stripe from "stripe";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { resend } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { jsonError } from "@/lib/utils";

export async function POST(req: Request) {
  if (!stripe) return jsonError("Stripe is not configured", 500);
  if (!env.stripeWebhookSecret) return jsonError("Missing webhook secret", 500);

  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) return jsonError("Missing stripe-signature", 400);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.stripeWebhookSecret
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return jsonError("Invalid signature", 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const customerEmail =
          session.customer_details?.email || session.customer_email || null;

        const payload = {
          stripe_event_id: event.id,
          checkout_session_id: session.id,
          customer_email: customerEmail,
          customer_id: typeof session.customer === "string" ? session.customer : null,
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          currency: session.currency,
          created_at: new Date().toISOString()
        };

        console.log("checkout.session.completed", payload);

        if (supabaseAdmin) {
          await supabaseAdmin.from("payments").insert(payload);
        }

        if (resend && customerEmail && env.resendFromEmail) {
          await resend.emails.send({
            from: env.resendFromEmail,
            to: [customerEmail],
            subject: "Payment received",
            html: `
              <h1>ชำระเงินสำเร็จ</h1>
              <p>Session: ${session.id}</p>
              <p>ทีม DSG จะเริ่ม provision ระบบให้อัตโนมัติ</p>
            `
          });
        }

        break;
      }

      case "payment_intent.succeeded": {
        console.log("payment_intent.succeeded", event.id);
        break;
      }

      default:
        console.log("Unhandled event:", event.type);
    }

    return Response.json({ ok: true, received: true });
  } catch (error) {
    console.error("Webhook handler failed:", error);
    return jsonError("Webhook handler failed", 500);
  }
}
