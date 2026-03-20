import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { jsonError } from "@/lib/utils";

export async function GET() {
  return jsonError("Method not allowed. Use POST.", 405);
}

export async function POST() {
  try {
    if (!stripe) return jsonError("Stripe is not configured", 500);
    if (!env.stripePriceId) return jsonError("Missing STRIPE_PRICE_ID", 500);
    if (!env.appUrl) return jsonError("Missing NEXT_PUBLIC_APP_URL", 500);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: env.stripePriceId,
          quantity: 1
        }
      ],
      success_url: `${env.appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.appUrl}/cancel`
    });

    if (!session.url) {
      return jsonError("Stripe checkout URL was not created", 500);
    }

    return Response.json({ ok: true, url: session.url }, { status: 200 });
  } catch (error) {
    console.error("Stripe checkout route failed:", error);
    return jsonError("Stripe checkout route failed", 500);
  }
}
