import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const body = await req.json();

  const session = await stripe.checkout.sessions.create({
    customer_email: body.email,
    line_items: [
      {
        price_data: {
          currency: "thb",
          product_data: {
            name: "DSG Access",
          },
          unit_amount: 100, // 1 บาท
          recurring: {
            interval: "month",
          },
        },
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: "https://tdealer01-crypto-dsg-control-plane.vercel.app/success",
    cancel_url: "https://tdealer01-crypto-dsg-control-plane.vercel.app/cancel",
  });

  return Response.json({ url: session.url });
}
