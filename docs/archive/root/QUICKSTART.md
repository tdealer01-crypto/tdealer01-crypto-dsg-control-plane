# DSG ONE Quick Start Guide — 5 Minutes to Live AI Governance

Welcome to **DSG ONE / ProofGate**, the AI runtime governance and control plane. This guide takes you from zero to a live, gated AI agent in under 5 minutes.

## What you'll get

- ✓ Live control plane instance running locally or on Vercel
- ✓ First API key for authentication
- ✓ Real-time decision logging and audit trail
- ✓ Dashboard showing all gated actions

---

## Step 1: Clone and Install (2 min)

### Option A: GitHub CLI (fastest)

```bash
gh repo clone tdealer01-crypto-dsg-control-plane dsg-one
cd dsg-one
npm ci
```

### Option B: Git

```bash
git clone https://github.com/tdealer01-crypto-dsg-control-plane dsg-one
cd dsg-one
npm ci
```

### What npm ci does

- Installs exact versions from `package-lock.json`
- Skips postinstall hooks that may fail in CI
- Locks dependencies for reproducibility

---

## Step 2: Environment Setup (1 min)

### Copy the example env file

```bash
cp .env.example .env.local
```

### Fill in required variables

**Minimum to run locally:**

```bash
# App identity
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://localhost:3000

# Supabase (get from https://supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Anthropic (for Hermes AI runtime)
ANTHROPIC_API_KEY=sk-ant-...
```

**To use the development configuration file:**

```bash
export DSG_CONFIG_PATH=./config/default.json
# or
export DSG_CONFIG_PATH=./config/default.yaml
```

---

## Step 3: Run the Control Plane (1 min)

### Start the development server

```bash
npm run dev
```

You should see:

```
Ready in 2.3s

Local:  http://localhost:3000
```

### Open your browser

Navigate to `http://localhost:3000` and you'll see the **Control Plane Dashboard**.

---

## Step 4: Create Your First API Key (1 min)

1. Log in at `http://localhost:3000/auth/signin` (uses Supabase auth)
2. Go to **Dashboard** → **API Keys**
3. Click **Create API Key**
4. Save the key securely — it won't be shown again

Example response:

```json
{
  "id": "key_abc123",
  "key": "YOUR_API_KEY_HERE",
  "org_id": "org_123",
  "created_at": "2024-06-26T..."
}
```

---

## Step 5: Make Your First Gated Request (optional, but recommended)

### Test the execution endpoint

```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test-agent",
    "action": "transfer_funds",
    "amount": 100,
    "recipient": "wallet_xyz"
  }'
```

**Response (example):**

```json
{
  "decision": "ALLOW",
  "reason": "Within daily limit",
  "execution_id": "exec_123",
  "latency_ms": 45
}
```

---

## Step 6: View Your Dashboard

1. Go to **http://localhost:3000/dashboard**
2. You'll see:
   - **Active Agents** count
   - **Recent Executions** (ALLOW/BLOCK/STABILIZE decisions)
   - **System Status** (Core DB health)
   - **Onboarding Progress**

---

## What's next?

| Task | Link | Time |
|------|------|------|
| Configure Hermes AI | `/dashboard/hermes` | 2 min |
| Set up policies | `/dashboard/policies` | 3 min |
| Enable billing | `/dashboard/billing` | 2 min |
| View audit trail | `/dashboard/audit` | 1 min |

---

## Common issues

### "Supabase connection failed"

- [ ] Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Verify the URL is correct (from Supabase dashboard)
- [ ] Confirm Supabase project is active

### "Auth not working"

- [ ] Make sure Supabase auth is enabled
- [ ] Check ANON_KEY is not empty

### "Port 3000 already in use"

```bash
# Use a different port
npm run dev -- -p 3001
```

---

## Configuration formats

You can specify configuration in three formats. The control plane loads them in this order:

1. **Environment variables** (highest priority)
2. **JSON** (`config/default.json`)
3. **YAML** (`config/default.yaml`)

Example with JSON:

```bash
export DSG_CONFIG_FORMAT=json
npm run dev
```

Example with YAML:

```bash
export DSG_CONFIG_FORMAT=yaml
npm run dev
```

---

## Production deployment

### Deploy to Vercel

```bash
npm run deploy:prod
```

### Required environment variables in production

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

### Check deployment health

```bash
npm run go:no-go https://your-production-url.vercel.app
```

---

## Next steps

- Read the full **[API Reference](/docs/API_REFERENCE.md)**
- Explore **[Governance Policies](/docs/governance-policies.md)**
- Join the community on Discord
- Email support: `support@dsg.pics`

Happy governance! 🛡️
