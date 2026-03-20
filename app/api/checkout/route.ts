import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

function evaluateDSG(value: number) {
  if (value < 0) return "BLOCK"

  const drift = Math.abs(value - 10) / 10
  if (drift > 0.4) return "STABILIZE"

  return "ALLOW"
}

export async function POST(req: Request) {
  const body = await req.json()
  const amount = body.amount || 10

  const decision = evaluateDSG(amount)

  if (decision === "BLOCK") {
    return NextResponse.json(
      { error: "Blocked by DSG" },
      { status: 403 }
    )
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cancel`,
  })

  return NextResponse.json({ url: session.url })
}
