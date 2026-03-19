import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { jsonError } from "@/lib/utils";

export async function POST() {
  if (!stripe) return jsonError("Stripe is not configured", 500);
  if (!env.stripePriceId) return jsonError("Missing STRIPE_PRICE_ID", 500);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price: env.stripePriceId,
        quantity: 1
      }
    ],
    success_url: `${env.appUrl}/dashboard?status=success`,
    cancel_url: `${env.appUrl}/dashboard?status=cancel`
  });

  return Response.json({ ok: true, url: session.url });
}
