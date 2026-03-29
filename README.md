# DSG Control Plane

Deterministic control plane for AI systems with governance, audit, and billing built in.

## Product Routes

### Public
- `/`
- `/pricing`
- `/docs`
- `/login`
- `/workspace` (authenticated)
- `/quickstart` (authenticated)

### Dashboard
- `/dashboard`
- `/dashboard/agents`
- `/dashboard/executions`
- `/dashboard/policies`
- `/dashboard/billing`

### API
- `/api/health`
- `/api/agents`
- `/api/execute`
- `/api/metrics`
- `/api/usage`

## Core Product Loop
1. User logs in
2. User lands in `/workspace` after magic-link confirmation
3. User opens `/quickstart` to run the guided loop
4. User creates an agent
5. User receives an API key
6. User calls `/api/execute`
7. Dashboard shows decisions and usage
8. Billing reflects consumption

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Required Environment Variables

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO=
STRIPE_PRICE_BUSINESS=
WORKOS_API_KEY=
WORKOS_CLIENT_ID=
RESEND_API_KEY=
DSG_DEFAULT_POLICY_ID=policy_default
```

## Quickstart

### Create an agent

```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "demo-agent",
    "policy_id": "policy_default",
    "monthly_limit": 10000
  }'
```

### Execute

```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Authorization: Bearer dsg_live_demo" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agt_demo",
    "input": {
      "prompt": "approve invoice #123"
    },
    "context": {
      "risk_score": 0.12
    }
  }'
```

## Notes

This repo currently contains blueprint endpoints and UI needed for handoff. The next milestone is wiring API routes to Supabase and Stripe for persistence and real billing.
