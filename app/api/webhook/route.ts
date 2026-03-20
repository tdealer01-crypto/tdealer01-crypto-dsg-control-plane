import Stripe from "stripe";

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-02-24.acacia",
  });

  const body = await req.text();

  console.log("Webhook received");

  return new Response("ok", { status: 200 });
}
