import Stripe from "stripe";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2022-11-15",
});

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return Response.json(
      {
        error: {
          code: "missing_env",
          message: "STRIPE_WEBHOOK_SECRET is missing",
        },
      },
      { status: 500 }
    );
  }

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return Response.json(
      {
        error: {
          code: "missing_signature",
          message: "Missing stripe-signature header",
        },
      },
      { status: 400 }
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    return Response.json(
      {
        error: {
          code: "invalid_signature",
          message: err.message,
        },
      },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        await supabase.from("subscriptions").upsert(
          {
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            status: "active",
          },
          { onConflict: "stripe_customer_id" }
        );
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;

        await supabase
          .from("subscriptions")
          .update({ status: "active" })
          .eq("stripe_subscription_id", invoice.subscription as string);

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id);

        break;
      }

      default:
        break;
    }

    return new Response(null, { status: 200 });
  } catch (err: any) {
    return Response.json(
      {
        error: {
          code: "internal_error",
          message: err.message,
        },
      },
      { status: 500 }
    );
  }
}
