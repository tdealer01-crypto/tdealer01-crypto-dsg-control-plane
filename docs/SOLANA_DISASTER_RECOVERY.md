# Solana Integration Disaster Recovery & On-Call Runbook

**Audience:** On-call engineers responding to Solana integration outages or degradation.

**Status:** Phase 3 Feature 3 Complete (June 30, 2026)

This guide provides a quick-reference runbook for diagnosing and mitigating Solana-related failures at 3am.

---

## Quick Triage (First 5 Minutes)

### 1. Confirm the Problem

```bash
# Check if production is currently failing
curl -s "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health" | jq '.status'
# Expected: "ok"

# If not ok, check last hour of failures
curl -s "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute" \
  -H "Authorization: Bearer $TEST_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test",
    "action": {"type": "transfer_sol", "recipient": "...", "amount": 0.001}
  }' | jq '.status'

# If it fails, note the error type for step 2
```

### 2. Categorize the Issue

| Symptom | Likely Cause | Runbook Section |
|---------|------------|-----------------|
| `404 Not Found` on `/api/execute` | Deployment problem | Deploy Health Check |
| Timeout (>30s) | RPC endpoint issue | RPC Health Check |
| `insufficient_balance` error | Treasury depleted | Treasury Emergency |
| Same error repeated 100+ times | Configuration issue | Config Check |
| Some agents fail, others succeed | Agent-specific config | Agent Config Check |

---

## System Health Check Sequence

Run these checks in order. Stop when you find the issue.

### Step 1: Deployment Health

```bash
# Is the app deployed and running?
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status | jq .

# Expected output:
# {
#   "status": "ok",
#   "commit": "abc123def456",
#   "environment": "production",
#   "db_ok": true,
#   "timestamp": "2026-06-30T12:34:56Z"
# }
```

**If returns 404 or connection refused:**
- Check Vercel dashboard: https://vercel.com/dashboard
- Look for deployment status (should be "Ready")
- If failed, check build logs
- If needed, trigger manual redeploy: `vercel --prod`

### Step 2: Solana RPC Endpoint Health

```bash
# Check if RPC endpoint is responding
curl -s "https://api.devnet.solana.com" -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}' | jq .

# Expected: {"jsonrpc":"2.0","result":{"solana-core":"1.x.x"},"id":1}
```

**If RPC is down (timeout or error):**

```bash
# Use fallback RPC endpoint
# In Vercel environment, set:
SOLANA_RPC_ENDPOINT=https://api.testnet.solana.com
# (or secondary RPC if available)

# Redeploy:
vercel env add SOLANA_RPC_ENDPOINT production
vercel --prod
```

**If multiple RPC endpoints fail:**
- Check Solana network status: https://status.solana.com
- If network-wide issue, activate dry-run mode (see below)

### Step 3: Treasury Balance

```bash
# Check treasury wallet balance
TREASURY_ADDR="<treasury_public_key>"
solana balance $TREASURY_ADDR --url devnet

# Expected: >= 1.0 SOL
```

**If balance < 1.0 SOL:**

Proceed to Treasury Emergency section below.

### Step 4: Recent Transaction Status

```sql
-- Check Supabase for failed payments (last 1 hour)
SELECT
  COUNT(*) as failure_count,
  error_type
FROM payment_ledger
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY error_type
ORDER BY failure_count DESC;
```

**If specific error type dominates:**
- See SOLANA_RECOVERY_PROCEDURES.md for scenario details
- Match error to root cause
- Follow recovery steps

---

## Common Failure Patterns & Mitigation

### Pattern 1: RPC Endpoint Down

**Symptoms:**
- All transactions timeout
- Logs show `Connection refused` or `timeout`
- `/api/health` returns error

**Mitigation (5 min):**

```bash
# Use fallback RPC endpoint
vercel env add SOLANA_RPC_ENDPOINT production --value "https://api.testnet.solana.com"
vercel --prod

# Monitor:
# Watch for confirmation_time in logs
# If successful, issue is resolved
```

**If no fallback available:**

```bash
# Switch to dry-run mode (no real transactions)
# Set in Vercel:
SOLANA_TREASURY_PRIVATE_KEY=""  # Clear/unset
# Redeploy:
vercel --prod

# System will automatically fall back to dry-run
# Users will get mock signatures (no real SOL transfers)
# Document: "Solana integration in dry-run mode due to RPC outage"
```

### Pattern 2: Devnet Restart (Forks)

**Symptoms:**
- Transactions confirm but with high latency
- `blockhash_expired` errors
- Balance queries return unexpected values

**Cause:**
- Solana devnet was restarted (happens weekly Wednesdays ~14 UTC)
- All accounts reset
- Treasury balance reset to 0

**Mitigation (10 min):**

```bash
# Step 1: Confirm devnet restart
curl -s https://api.devnet.solana.com -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}' | jq '.result'

# Compare with Solana status page: https://status.solana.com

# Step 2: Re-fund treasury (devnet only)
TREASURY_ADDR="<treasury_public_key>"
solana airdrop 10 $TREASURY_ADDR --url devnet

# Step 3: Verify:
solana balance $TREASURY_ADDR --url devnet
```

### Pattern 3: Devnet Congestion

**Symptoms:**
- Confirmation times spike (p99 > 30s)
- Occasional `blockhash_expired` errors
- Ledger shows mix of confirmed and timeout failures

**Mitigation (no action needed):**

- Devnet congestion is self-healing
- Transactions will eventually confirm
- Monitor but don't intervene
- If sustained >2 hours, escalate to devnet maintainers

### Pattern 4: Treasury Depleted

**Symptoms:**
- `insufficient_balance` errors spike
- Treasury balance query returns < 0.1 SOL
- All new transactions fail

**Mitigation (15 min):**

See Treasury Emergency section below.

### Pattern 5: Configuration Drift

**Symptoms:**
- Some agents succeed, others fail consistently
- Agent-specific error patterns
- Environment variables mismatch

**Mitigation (20 min):**

```bash
# Step 1: Verify environment variables
vercel env ls production | grep SOLANA

# Expected:
# SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com
# SOLANA_TREASURY_PRIVATE_KEY=<base64_value>

# If missing or wrong:
vercel env add SOLANA_RPC_ENDPOINT production
vercel env add SOLANA_TREASURY_PRIVATE_KEY production

# Step 2: Redeploy
vercel --prod

# Step 3: Wait 2 minutes, then test
```

---

## Treasury Emergency Response

**When treasury balance < 0.5 SOL during active transactions:**

### Immediate Actions (2 min)

```bash
# Step 1: Verify balance
TREASURY_ADDR="<treasury_public_key>"
solana balance $TREASURY_ADDR --url devnet

# Step 2: If critical (< 0.1 SOL), activate dry-run
vercel env remove SOLANA_TREASURY_PRIVATE_KEY production
vercel --prod
# System will fall back to dry-run automatically

# Step 3: Notify on-call manager
# Message: "Treasury balance critical, dry-run mode activated"
```

### Fund Injection (5-10 min)

**On Devnet:**

```bash
# Get available devnet airdrop
solana airdrop 10 $TREASURY_ADDR --url devnet

# Verify
solana balance $TREASURY_ADDR --url devnet
```

**On Testnet/Mainnet:**

```bash
# Transfer from funded wallet
# (requires access to funded wallet keys)
solana transfer $TREASURY_ADDR 5 --url testnet
```

### Resume Production (5 min)

Once funded:

```bash
# Step 1: Re-enable production mode
vercel env add SOLANA_TREASURY_PRIVATE_KEY production
# (paste key again)

# Step 2: Redeploy
vercel --prod

# Step 3: Test transaction
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute \
  -H "Authorization: Bearer $TEST_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test",
    "action": {
      "type": "transfer_sol",
      "recipient": "...",
      "amount": 0.001
    }
  }'

# Expected: {"status":"success",...}
```

---

## Rollback Procedure

**If Solana integration is causing systemic failures:**

### Option 1: Disable Solana (Keep Dry-Run)

```bash
# Clear production key (falls back to dry-run)
vercel env remove SOLANA_TREASURY_PRIVATE_KEY production
vercel --prod

# Transactions will:
# - Use mock signatures (safe)
# - Log to ledger with "mode: dry_run"
# - Not touch real SOL
# - Allow time to diagnose
```

### Option 2: Full Rollback (Emergency)

```bash
# If you need to revert to prior commit:
git checkout main~1
vercel --prod

# Or deploy specific commit:
vercel --prod <commit_sha>

# This is nuclear option; avoid unless critical
```

### Option 3: Disable Payment Endpoint

In `app/api/execute/route.ts`, add:

```typescript
if (process.env.SOLANA_DISABLE === 'true') {
  return NextResponse.json({ error: 'Solana disabled' }, { status: 503 });
}
```

Then set:

```bash
vercel env add SOLANA_DISABLE production true
vercel --prod
```

---

## Communication Checklist

When Solana integration is degraded:

- [ ] Assess impact (how many agents affected?)
- [ ] Note start time and expected resolution time
- [ ] Notify on-call manager / on-call escalation
- [ ] Post to #incidents Slack channel:
  ```
  🔴 Solana Integration Degraded
  • Start: 2026-06-30 12:34 UTC
  • Impact: Payments for agents failing
  • RCA: RPC endpoint timeout
  • Mitigation: Switched to fallback RPC
  • ETA Recovery: 15 minutes
  ```
- [ ] Update status page (if applicable)
- [ ] Post resolution update when fixed:
  ```
  🟢 Solana Integration Recovered
  • Duration: 22 minutes
  • Root Cause: Temporary RPC outage
  • Action: Switched to secondary RPC endpoint
  • Follow-up: Will add monitoring alerts
  ```

---

## Post-Incident Review Checklist

After any outage, complete this within 24 hours:

```markdown
## Incident Report: [Incident Type]

### Timeline
- **Detection Time:** YYYY-MM-DD HH:MM UTC
- **Root Cause Identified:** YYYY-MM-DD HH:MM UTC
- **Resolution Time:** YYYY-MM-DD HH:MM UTC
- **Duration:** X minutes

### Root Cause Analysis
- What went wrong?
- Why did it go wrong?
- Why wasn't it caught earlier?

### Impact
- How many agents affected?
- How many transactions failed?
- Were any duplicate payments?

### Mitigation Taken
- What did on-call do immediately?
- What was the fix?
- Any workarounds needed?

### Prevention (Next Steps)
- [ ] Add monitoring alert to catch earlier
- [ ] Update runbook with new scenario
- [ ] Implement fallback mechanism
- [ ] Test recovery procedure

### Owner
- On-Call: [Name]
- Follow-up Owner: [Name]
- Target Completion: YYYY-MM-DD
```

---

## Reference Links

**Dashboards & Monitoring:**
- PostHog Solana Health: https://us.posthog.com/project/479488/dashboards/solana
- Solana Network Status: https://status.solana.com
- Vercel Deployment: https://vercel.com/dashboard

**Documentation:**
- SOLANA_INTEGRATION.md — Full architecture
- SOLANA_DEVNET_SETUP.md — Setup guide
- SOLANA_RECOVERY_PROCEDURES.md — Detailed recovery steps
- SOLANA_MONITORING_SETUP.md — Dashboard setup

**Key Contact:**
- On-Call Manager: [Slack handle or phone]
- Engineering Lead: [Slack handle or phone]
- Ops Lead: [Slack handle or phone]

---

## Quick Command Reference

```bash
# Check app health
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Check RPC endpoint
curl -X POST https://api.devnet.solana.com -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'

# Check treasury balance
solana balance <TREASURY_ADDR> --url devnet

# View recent failures (Supabase)
SELECT * FROM payment_ledger WHERE status='failed' AND created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at DESC LIMIT 20;

# Re-deploy
vercel --prod

# Set environment variable
vercel env add SOLANA_RPC_ENDPOINT production

# Test transaction
curl -X POST https://app.example.com/api/execute -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"agent_id":"test","action":{"type":"transfer_sol","recipient":"...","amount":0.001}}'
```

---

**Last Updated:** June 30, 2026  
**Version:** 1.0 (Phase 3 Feature 3)  
**Status:** On-Call Ready
