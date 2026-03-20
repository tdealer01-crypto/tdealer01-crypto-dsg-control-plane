import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    console.log("WEBHOOK:", body)

    if (body.type === "checkout.session.completed") {
      const email = body?.data?.object?.customer_email

      if (!email) {
        return Response.json({ error: "no email" })
      }

      const { error } = await supabase
        .from("users")
        .upsert({ email, is_active: true })

      if (error) {
        console.log("DB ERROR:", error.message)
        return new Response(error.message, { status: 500 })
      }

      console.log("USER ACTIVATED:", email)
    }

    return Response.json({ ok: true })
  } catch (err: any) {
    console.log("ERROR:", err.message)
    return new Response(err.message, { status: 500 })
  }
}
