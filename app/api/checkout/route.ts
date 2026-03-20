import Stripe from "stripe";

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-02-24.acacia",
  });

  const { email } = await req.json();

  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: "https://tdealer01-crypto-dsg-control-plane.vercel.app/success",
    cancel_url: "https://tdealer01-crypto-dsg-control-plane.vercel.app/cancel",
  });

  return Response.json({ url: session.url });
}
