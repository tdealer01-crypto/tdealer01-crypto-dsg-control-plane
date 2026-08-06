# Supabase Environment Setup — Trinity Dashboard + DSG Control Plane

**Get Trinity Dashboard + DSG running with Supabase in 5 minutes.**

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Get Your Supabase Keys

Go to [https://supabase.com/dashboard](https://supabase.com/dashboard):

1. **Create a new project** (or use existing)
   - Name: `dsg-trinity-dashboard`
   - Region: Closest to you
   - Password: Secure password

2. **Get your keys** (Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `anon` public key
   - `SUPABASE_SERVICE_ROLE_KEY` — Service role key (keep secret!)

### Step 2: Create `.env.local`

```bash
# Copy from example
cp .env.example .env.local

# Edit and add your Supabase credentials
nano .env.local
```

### Step 3: Add These Values

```bash
# Supabase (from dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Trinity Dashboard (for live API connection)
REACT_APP_TRINITY_API_URL=https://api.dsg.local
TRINITY_JWT_TOKEN=your-jwt-token-or-empty-for-mock-auth
```

### Step 4: Start

```bash
npm install
npm run dev
```

Open: **http://localhost:3000**

Login with mock auth:
```
Email: any@example.com
Password: anything (6+ chars)
```

---

## 📋 Environment Variables Reference

### Required for Trinity Dashboard

| Variable | Value | Where to Get |
|---|---|---|
| `REACT_APP_TRINITY_API_URL` | `https://api.dsg.local` | Trinity API endpoint |
| `TRINITY_JWT_TOKEN` | (optional) | Supabase JWT token |

### Required for Supabase (DSG Core)

| Variable | Value | Where to Get |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase Dashboard → Settings → API (public/anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Supabase Dashboard → Settings → API (service_role key) |

### Optional for Enhanced Features

| Variable | Purpose | Default |
|---|---|---|
| `STRIPE_SECRET_KEY` | Billing integration | (skip for demo) |
| `STRIPE_WEBHOOK_SECRET` | Webhook validation | (skip for demo) |
| `ANTHROPIC_API_KEY` | LLM features | (skip for demo) |

---

## ✅ Verification Checklist

After setup, verify everything works:

```bash
# 1. Check Supabase connection
npm run dev
# Look for console output: "Supabase client initialized"

# 2. Test Trinity Dashboard
# Open http://localhost:3000/trinity-dashboard
# (Or http://localhost:3000 if trinity-dashboard is root)

# 3. Login with mock auth
Email: test@example.com
Password: password123

# 4. See 7 agents live (or mock data if API unavailable)
Dashboard tab → Should show all agents
```

---

## 🔐 Security Notes

**DO NOT commit `.env.local` to git:**

```bash
# Already in .gitignore, but verify:
cat .gitignore | grep "\.env"
# Should show: .env.local, .env.*.local, etc.
```

**Keep secrets safe:**
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side only, never expose to client
- `STRIPE_SECRET_KEY` — Server-side only, never expose
- `ANTHROPIC_API_KEY` — Server-side only, never expose

---

## 🐳 Docker Deployment

For production Trinity Dashboard with Supabase:

```bash
# Build
docker build -t trinity-dashboard \
  --build-arg REACT_APP_TRINITY_API_URL=https://api.dsg.local \
  .

# Run with env vars
docker run -d \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... \
  -e TRINITY_API_URL=https://api.dsg.local \
  --name trinity-dashboard \
  trinity-dashboard:latest
```

---

## 🚀 Vercel Production Deployment

For Vercel, add environment variables via dashboard:

**Vercel → Settings → Environment Variables**

| Variable | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Production only (hidden) |
| `REACT_APP_TRINITY_API_URL` | Trinity API URL | Production, Preview, Development |
| `TRINITY_JWT_TOKEN` | JWT token | Production only (hidden) |

---

## 🔗 Trinity API Integration

Trinity Dashboard connects to **5 Trinity API endpoints:**

```typescript
GET  /api/agents/status              // All 7 agents
POST /api/agents/mode                // Sandbox/live toggle
GET  /api/cost/tracker?period=24h    // Cost tracking
GET  /api/security/audit             // Audit logs
GET  /api/state/continuity           // Health metrics
```

**Auto-connects every 10 seconds** if Trinity API is available.

**Falls back to mock data** if Trinity API is unavailable (demo mode).

---

## 📱 Mock Auth vs. Real Auth

### Mock Auth (Built-in — Default)

No setup required. Works immediately for demo/testing:

```
Email:    any@example.com
Password: anything (6+ chars)
Token:    Generated locally, stored in localStorage
Use:      Demo, testing, development
```

### Real Supabase JWT (Production)

For production, use real Supabase authentication:

**1. Add Supabase credentials to `.env.local`:**

```bash
# Supabase (required for real auth)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Trinity Dashboard (optional)
REACT_APP_TRINITY_API_URL=https://api.dsg.local
```

**2. Set up Supabase Auth in your project:**

Go to Supabase Dashboard → Authentication → Users:
- Create users manually, or
- Enable Email/Password signup in Authentication → Providers

**3. Test real Supabase JWT:**

```bash
npm run dev
# Open http://localhost:3000/trinity-dashboard
# Login with your Supabase email + password
# Token is automatically retrieved from /api/auth/login
```

**4. Automatic fallback:**

If Supabase is not configured (missing env vars), Trinity Dashboard automatically falls back to Mock Auth.

**5. For Vercel Production:**

Set these environment variables in Vercel dashboard:

| Variable | Value | Scope |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Production only |

---

## 🆘 Troubleshooting

### "Cannot connect to Supabase"
```bash
# Check:
1. NEXT_PUBLIC_SUPABASE_URL is correct
2. NEXT_PUBLIC_SUPABASE_ANON_KEY is valid
3. Supabase project is running
4. Check browser console for errors

# Test:
curl -H "Authorization: Bearer $ANON_KEY" \
  "https://xxxxx.supabase.co/rest/v1/auth/v1/verify"
```

### "Trinity Dashboard not loading"
```bash
# Check:
1. npm run dev is running
2. http://localhost:3000 is accessible
3. Check console for JavaScript errors
4. Verify REACT_APP_TRINITY_API_URL is set

# Test:
curl http://localhost:3000/api/agent/status
```

### "Mock auth not working"
```bash
# Mock auth should work with any email + password (6+ chars)
# Try:
Email:    test@example.com
Password: password123

# If still failing, check browser console for errors
# Clear localStorage:
localStorage.clear()
# Refresh page
```

---

## 📚 Next Steps

1. ✅ Set up Supabase keys in `.env.local`
2. ✅ Run `npm run dev`
3. ✅ Open Trinity Dashboard at http://localhost:3000
4. ✅ Login with mock auth or real JWT
5. ✅ See all 7 agents live
6. ✅ Monitor costs, audit logs, orchestration health

---

## 🎯 What You Get

```
✅ Live agent monitoring (all 7 agents)
✅ Real-time cost tracking
✅ Security audit logs (hash-chained)
✅ Orchestration health metrics
✅ Chat interface to agents
✅ CLI commands reference
✅ API endpoint documentation
✅ Responsive dark mode UI
✅ Supabase JWT auth ready
✅ Mock auth fallback
```

---

**Ready to go!** 🚀

```bash
npm run dev
# Open: http://localhost:3000
# Login: any@example.com / password123
# See: Trinity Dashboard with all 7 agents
```
