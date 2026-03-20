
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
