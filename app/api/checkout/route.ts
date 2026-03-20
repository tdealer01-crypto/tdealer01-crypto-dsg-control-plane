import Stripe from "stripe"

export const runtime = "nodejs"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = body.email

    if (!email) {
      return new Response("Missing email", { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: process.env.NEXT_PUBLIC_URL + "/dashboard",
      cancel_url: process.env.NEXT_PUBLIC_URL + "/pay",
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err: any) {
    console.log("ERROR:", err.message)
    return new Response(err.message || "error", { status: 500 })
  }
}
