# Phase 5 Setup Guide — Production GO/NO-GO Gate

## Quick Setup (10 minutes)

### Step 1: Apply Supabase Migration

The migration creates the `deployment_gates` table and related functions.

**Option A: Via CLI (if connected to Supabase locally)**

```bash
cd supabase
supabase migration up
```

**Option B: Via Supabase Dashboard (for production)**

1. Go to https://supabase.com/dashboard
2. Select your organization and project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy the contents of `supabase/migrations/20260802000001_deployment_gates.sql`
6. Paste into the SQL editor
7. Click **Run** and verify no errors

**Option C: Via Vercel (automatic on next deploy)**

- The migration will auto-apply when the Next.js app deploys to Vercel
- Migrations are applied before the app starts

### Step 2: Add GitHub Secrets

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these secrets (by name only, never print values):

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
VERCEL_API_TOKEN (optional - gate will be skipped if missing)
```

**Where to find these values:**

- **SUPABASE_URL**: Supabase Dashboard → Project Settings → API → URL
- **SUPABASE_SERVICE_ROLE_KEY**: Supabase Dashboard → Project Settings → API → Service Role Key
- **ANTHROPIC_API_KEY**: Anthropic Console → API Keys
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Supabase Dashboard → Project Settings → API → Anon Key
- **VERCEL_API_TOKEN**: Vercel Dashboard → Settings → Tokens (optional)

### Step 3: Regenerate TypeScript Types

After applying the migration, regenerate types to include `deployment_gates`:

```bash
npm run supabase:types
npm run typecheck
```

### Step 4: Verify Workflow is Enabled

1. Go to repository **Actions** tab
2. Check that **Production GO/NO-GO Gate** workflow is listed
3. If disabled, click **Enable**

### Step 5: Test Local Gate

```bash
npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app
```

Expected output: GO/NO-GO/REVIEW decision with 8 check results

### Step 6: Test Automated Gate

Option A: Manual trigger via GitHub UI

1. Go to **Actions** → **Production GO/NO-GO Gate**
2. Click **Run workflow**
3. Select branch (`main`)
4. (Optional) Enter production URL
5. Click **Run workflow**

Option B: Manual trigger via CLI

```bash
gh workflow run production-go-nogo.yml -f production_url="https://tdealer01-crypto-dsg-control-plane.vercel.app"
```

Check results in:
- Actions tab (workflow run)
- Issues tab (gate decision comment)
- Artifacts (production-gate-result-*.json)

## Advanced Configuration

### Change Scheduled Gate Checks

Edit `.github/workflows/production-go-nogo.yml`:

```yaml
schedule:
  - cron: '0 2 * * *'  # Currently: 2 AM UTC daily
  # Options:
  # - cron: '0 */6 * * *'  # Every 6 hours
  # - cron: '0 9 * * 1-5'  # Weekdays at 9 AM
  # - cron: '0 12 * * 0'   # Sundays at 12 PM
```

Cron format: `minute hour day month day-of-week` (all UTC)

### Increase Gate Timeout

Some environments may need longer timeouts. Edit `scripts/production-gate.ts`:

```typescript
const TIMEOUT_MS = 10000; // Currently 10 seconds
// Change to: const TIMEOUT_MS = 30000; // 30 seconds
```

Then rebuild and test:

```bash
npm run go:no-go https://production-url
```

### Make Vercel Check Required

By default, Vercel check is optional (skipped if `VERCEL_API_TOKEN` missing).

To make it required, edit `scripts/production-gate.ts`:

```typescript
if (!vercelApiToken) {
  // Change from SKIPPED to FAIL to block deployment
  return {
    name: 'vercel_deployment_status',
    status: 'FAIL',  // Was: SKIPPED
    details: 'VERCEL_API_TOKEN is required',
    latency_ms: Date.now() - start,
  };
}
```

### Custom Gate Checks

To add additional checks (e.g., third-party service health), modify `scripts/production-gate.ts`:

1. Create a new async function:
   ```typescript
   async function checkCustomService(): Promise<CheckResult> {
     // Implementation
   }
   ```

2. Call it in `runProductionGate()`:
   ```typescript
   const customCheck = await checkCustomService();
   checks.push(customCheck);
   ```

3. Add to console output:
   ```typescript
   console.log(`  ${customCheck.status === 'PASS' ? '✅' : '❌'} Custom Service: ${customCheck.status}`);
   ```

4. Test locally:
   ```bash
   npm run go:no-go https://production-url
   ```

## Troubleshooting

### "FAIL: Could not extract project name from URL"

**Cause**: Production URL is malformed or not a Vercel domain

**Fix**: Use format: `https://project-name.vercel.app`

### "SKIPPED: VERCEL_API_TOKEN not configured"

**Cause**: Optional check skipped because GitHub secret missing

**Fix**: 
- (Optional) Add `VERCEL_API_TOKEN` to GitHub secrets, OR
- (Optional) Make check required per instructions above

### "FAIL: Deployment status: BUILDING"

**Cause**: Vercel deployment is still building

**Fix**:
- Wait for Vercel build to complete
- Check Vercel Dashboard → Deployments tab for status
- Retry gate check after build finishes

### "FAIL: Missing environment variables: SUPABASE_URL, ..."

**Cause**: GitHub secrets not set

**Fix**:
1. Go to repository Settings → Secrets and variables → Actions
2. Add missing secrets
3. Retry gate check

### "TIMEOUT: Check timed out"

**Cause**: Endpoint not responding within 10 seconds

**Fix**:
- Verify production URL is reachable: `curl https://production-url/api/health`
- Check firewall/VPN restrictions
- Increase timeout in `scripts/production-gate.ts` (see Advanced Configuration)
- Check Vercel/Supabase status pages for outages

### "FAIL: Database connectivity failed"

**Cause**: Cannot connect to Supabase with service role key

**Fix**:
1. Verify `SUPABASE_SERVICE_ROLE_KEY` is valid (not expired)
2. Verify `SUPABASE_URL` is correct
3. Check Supabase project is not paused
4. Verify RLS policies allow service role queries
5. Check Supabase logs: Dashboard → Logs → API

### Gate decision is always NO-GO

**Debug steps**:

1. **Run locally with verbose output**:
   ```bash
   npm run go:no-go https://production-url 2>&1 | tee gate-debug.log
   cat gate-debug.log  # See each check result
   ```

2. **Test each probe individually**:
   ```bash
   curl -v https://production-url/api/health
   curl -v https://production-url/api/readiness
   curl -v https://production-url/api/agent/status
   ```

3. **Check Vercel deployment logs**:
   - Vercel Dashboard → Project → Deployments → [Latest] → Logs
   - Look for runtime errors or crash logs

4. **Check Supabase logs**:
   - Supabase Dashboard → Logs → API logs
   - Look for failed authentication or permission errors

5. **Post gate result to GitHub issue**:
   - Go to Actions → [Production GO/NO-GO Gate run] → workflow output
   - See full check results and latencies
   - Use `decision_rationale` field to understand failure

## Production Readiness Checklist

After Phase 5 setup:

- [ ] Migration applied to production database
- [ ] All GitHub secrets configured (SUPABASE_*, ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- [ ] VERCEL_API_TOKEN added (optional but recommended)
- [ ] TypeScript types regenerated (`npm run supabase:types`)
- [ ] Local gate check passes: `npm run go:no-go <production-url>` → GO
- [ ] Automated workflow triggered and passed
- [ ] Gate decision recorded to GitHub issue
- [ ] Artifact uploaded: `production-gate-result-*.json`

## Testing Matrix

| Scenario | Test | Expected |
|----------|------|----------|
| All checks pass | `npm run go:no-go <url>` | GO decision, exit code 0 |
| Missing env var | Unset SUPABASE_URL, run gate | NO-GO (env check fails) |
| Production down | Gate check to unreachable URL | NO-GO (all probes timeout) |
| Migration not applied | Delete row from schema_migrations, run gate | NO-GO (migration check fails) |
| Vercel building | Run gate during Vercel build | NO-GO (deployment check fails) |
| All skipped | Unset all secrets, run gate | REVIEW (requires manual approval) |

## Integration with Deployment Pipeline

### Example: Conditional deployment based on gate

`.github/workflows/deploy.yml`:

```yaml
jobs:
  production-gate:
    runs-on: ubuntu-latest
    outputs:
      decision: ${{ steps.gate.outputs.decision }}
    steps:
      - name: Run production gate
        id: gate
        run: |
          npm run go:no-go ${{ secrets.PRODUCTION_URL }} > result.json
          DECISION=$(jq -r '.decision' result.json)
          echo "decision=${DECISION}" >> $GITHUB_OUTPUT

  deploy:
    needs: production-gate
    if: needs.production-gate.outputs.decision == 'GO'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: vercel --prod
```

This ensures production deployment only runs if gate returns GO.

## Support & Escalation

**Gate returning REVIEW?**
- Check GitHub issue for which secrets are missing
- Contact DevOps team to add missing secrets
- Escalate access requests to infrastructure team

**Gate consistently failing?**
- Check gate result artifact for detailed check output
- Review Vercel/Supabase logs for errors
- Post issue with gate result JSON for investigation

**Need to bypass gate?**
- Document reason in GitHub issue
- Get approval from tech lead or DevOps
- Manually promote via Vercel Dashboard
- Update gate to prevent future false positives

## Next Steps

Once Phase 5 is working:

1. **Integrate into CI/CD**: Make gate a required check before production deployment
2. **Monitor gate decisions**: Track GO/NO-GO/REVIEW ratios in dashboards
3. **Phase 6**: Add compliance evidence collection to gate workflow
4. **Phase 7**: Extend gate to check multi-region failover readiness

---

**Questions?** See `docs/PHASE5_PRODUCTION_GATE.md` for detailed architecture and troubleshooting.
