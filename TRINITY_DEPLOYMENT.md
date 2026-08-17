# Trinity Revenue System Deployment Guide

Complete setup for automatic revenue generation from Trinity agent costs.

## Overview

- **Trinity API Service**: Node.js server providing cost metrics
- **Trinity MCP Server**: Model Context Protocol bridge to Claude
- **Revenue Sync**: Automated hourly sync to Supabase
- **Cron Endpoint**: Secure scheduled sync via `/api/cron/trinity-revenue-sync`

## Deployment Steps

### 1. Deploy Trinity API Service

Deploy to Render or similar platform:

```bash
# Repository: tdealer01-crypto-dsg-control-plane
# Directory: trinity-api-service/
# Start command: npm start
# Port: 3001
# Environment: NODE_ENV=production
```

After deployment, record the URL:
```
TRINITY_API_URL=https://trinity-api-dsg.onrender.com
```

### 2. Generate JWT Token

```bash
# Generate secure JWT token for Trinity authentication
HEADER=$(echo -n '{"alg":"HS256","typ":"JWT"}' | base64)
PAYLOAD=$(echo -n '{"iss":"trinity-dsg","sub":"revenue-sync","aud":"dsg-control-plane","exp":'$(($(date +%s) + 31536000))'}' | base64)
SIGNATURE=$(echo -n "$HEADER.$PAYLOAD" | openssl dgst -sha256 -hmac "your-trinity-secret-key" -binary | base64)
TRINITY_JWT_TOKEN="$HEADER.$PAYLOAD.$SIGNATURE"

echo "Save this token securely:"
echo $TRINITY_JWT_TOKEN
```

### 3. Configure GitHub Secrets

Set these secrets in the repository:

```bash
# Trinity API Configuration
TRINITY_API_URL=https://trinity-api-dsg.onrender.com
TRINITY_JWT_TOKEN=<generated-token>

# Cron Authorization
CRON_SECRET=<generate-strong-random-secret>

# Example (replace with real values):
# CRON_SECRET=$(openssl rand -base64 32)
```

Using GitHub CLI:
```bash
gh secret set TRINITY_API_URL --repo tdealer01-crypto/tdealer01-crypto-dsg-control-plane --body "https://trinity-api-dsg.onrender.com"
gh secret set TRINITY_JWT_TOKEN --repo tdealer01-crypto/tdealer01-crypto-dsg-control-plane --body "<token>"
gh secret set CRON_SECRET --repo tdealer01-crypto/tdealer01-crypto-dsg-control-plane --body "<secret>"
```

### 4. Apply Supabase Migration

Run migration on production database:

```bash
# Using Supabase CLI:
supabase migration up --project-id <project-id>

# Or via Dashboard:
# 1. Go to SQL Editor
# 2. Open supabase/migrations/20260817_trinity_revenue_tables.sql
# 3. Run the migration
```

Verify tables created:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'trinity%';
```

Expected tables:
- `trinity_revenue_records`
- `trinity_revenue_agents`
- `trinity_revenue_sync_state`

### 5. Regenerate Database Types

```bash
npx supabase gen types typescript --project-id <project-id> > lib/database.types.ts
npm run typecheck
```

### 6. Verify Cron Endpoint

```bash
# Test with authentication
curl -X GET \
  "https://your-deployment.com/api/cron/trinity-revenue-sync?period=24h" \
  -H "Authorization: Bearer $CRON_SECRET"

# Expected response:
# {
#   "ok": true,
#   "period": "24h",
#   "recordsCreated": 1,
#   "totalCost": 1245.30,
#   "agentCount": 3,
#   "errorCount": 0
# }
```

## Automation

Revenue sync runs on schedule defined in:
- `lib/revenue/autopilot-schedule.ts` - hourly cadence
- `.github/workflows/` - CI/CD automation

### Manual Trigger

```bash
# Trigger sync for last 24 hours
curl -X GET \
  "https://your-deployment.com/api/cron/trinity-revenue-sync?period=24h" \
  -H "Authorization: Bearer $CRON_SECRET"

# Trigger sync for last hour
curl -X GET \
  "https://your-deployment.com/api/cron/trinity-revenue-sync?period=1h" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Monitoring

Check revenue records:

```sql
-- Latest revenue records
SELECT 
  id, organization_id, period_start, period_end, 
  total_amount_usd, agent_count, status, created_at
FROM trinity_revenue_records
ORDER BY created_at DESC
LIMIT 10;

-- Agent breakdown
SELECT 
  agent_name, jobs_processed, cpu_usage, agent_cost_usd, created_at
FROM trinity_revenue_agents
ORDER BY created_at DESC
LIMIT 20;

-- Sync state
SELECT * FROM trinity_revenue_sync_state;
```

## Health Checks

### Trinity API Health
```bash
curl -s https://trinity-api-dsg.onrender.com/health | jq .
```

### Revenue Sync Health
Check `lib/trinity/revenue-sync.ts`:
- `checkTrinityRevenueHealth()` - health check function
- Returns `{trinity_api: boolean, database: boolean, healthy: boolean}`

## Troubleshooting

### "Database not configured"
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars
- Verify Supabase project is reachable

### "Trinity API unreachable"
- Check `TRINITY_API_URL` is correct and deployed
- Verify `TRINITY_JWT_TOKEN` is valid
- Test: `curl -H "Authorization: Bearer $TOKEN" https://trinity-api-url/api/trinity/costs`

### "Migration not applied"
- Verify tables exist in Supabase dashboard
- Run migration again via Dashboard → SQL Editor

### "Unauthorized" on cron endpoint
- Check `CRON_SECRET` is set in GitHub secrets
- Verify Authorization header: `Authorization: Bearer $CRON_SECRET`

## Architecture

```
Trinity Agents (real cost data)
         ↓
Trinity API Service (port 3001)
         ↓
Trinity MCP Server (Claude integration)
         ↓
Revenue Sync Service (/api/cron/trinity-revenue-sync)
         ↓
Supabase Database (trinity_revenue_* tables)
         ↓
Revenue Records (for billing/analytics)
```

## Next Steps

1. ✅ Deploy Trinity API Service
2. ✅ Generate JWT credentials
3. ✅ Set GitHub secrets
4. ✅ Apply Supabase migration
5. ⏳ Test revenue sync
6. ⏳ Configure Stripe metering (optional, future)
7. ⏳ Set up monitoring dashboard

## Support

- Trinity API docs: `/trinity-api-service/README.md`
- MCP Server docs: `/trinity-mcp-server/README.md`
- Revenue Sync docs: `/lib/trinity/README.md`
