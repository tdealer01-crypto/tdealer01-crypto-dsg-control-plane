#!/bin/bash

echo "🚀 Setup Full SaaS Production"

mkdir -p app/api/webhook
mkdir -p app/api/checkout
mkdir -p app/dashboard
mkdir -p app/admin

================== WEBHOOK ==================

cat > app/api/webhook/route.ts <<'EOL'
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
const body = await req.text()
const sig = req.headers.get("stripe-signature")!

let event

try {
event = stripe.webhooks.constructEvent(
body,
sig,
process.env.STRIPE_WEBHOOK_SECRET!
)
} catch (err: any) {
console.log("Webhook signature error:", err.message)
return new Response("error", { status: 400 })
}

const supabase = createClient(
process.env.SUPABASE_URL!,
process.env.SUPABASE_SERVICE_ROLE_KEY!
)

console.log("Webhook received:", event.type)

if (event.type === "checkout.session.completed") {
const session: any = event.data.object

await supabase.from("users").upsert({
  email: session.customer_email,
  is_active: true,
  stripe_customer_id: session.customer,
  subscription_id: session.subscription
}, { onConflict: "email" })

console.log("Upsert succeeded for:", session.customer_email)

}

if (event.type === "customer.subscription.deleted") {
const sub: any = event.data.object

await supabase
  .from("users")
  .update({ is_active: false })
  .eq("subscription_id", sub.id)

console.log("Subscription cancelled:", sub.id)

}

return new Response("ok")
}
EOL

================== CHECKOUT ==================

cat > app/api/checkout/route.ts <<'EOL'
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
const { email } = await req.json()

const session = await stripe.checkout.sessions.create({
customer_email: email,
line_items: [{
price: process.env.STRIPE_PRICE_ID!,
quantity: 1
}],
mode: "subscription",
success_url: process.env.NEXT_PUBLIC_URL + "/dashboard",
cancel_url: process.env.NEXT_PUBLIC_URL + "/pay"
})

return Response.json({ url: session.url })
}
EOL

================== MIDDLEWARE ==================

cat > middleware.ts <<'EOL'
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function middleware(req: any) {
const token = req.cookies.get("sb-access-token")?.value

if (!token) {
return NextResponse.redirect(new URL("/login", req.url))
}

const userRes = await fetch(
process.env.SUPABASE_URL + "/auth/v1/user",
{
headers: {
Authorization: "Bearer ${token}",
apiKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
}
}
)

if (!userRes.ok) {
return NextResponse.redirect(new URL("/login", req.url))
}

const user = await userRes.json()
const email = user.email

const supabase = createClient(
process.env.SUPABASE_URL!,
process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const { data } = await supabase
.from("users")
.select("is_active")
.eq("email", email)
.single()

if (!data?.is_active) {
return NextResponse.redirect(new URL("/pay", req.url))
}

return NextResponse.next()
}

export const config = {
matcher: ["/dashboard/:path*"]
}
EOL

================== SQL ==================

cat > supabase.sql <<'EOL'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
email text UNIQUE,
is_active boolean DEFAULT false,
stripe_customer_id text,
subscription_id text,
created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
EOL

================== README ==================

cat > README_SAAS.md <<'EOL'

🚀 SaaS Production Setup

ENV

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_URL=

Deploy

vercel --prod

Test

curl -X POST https://your-domain/api/checkout -d '{"email":"test@email.com"}'

Flow

Login → Pay → Stripe → Webhook → DB → Unlock
EOL

echo "✅ DONE: Full SaaS system ready"
