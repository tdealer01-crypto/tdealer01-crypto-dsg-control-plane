# Phase 4 Setup Guide — Preview Database Isolation

## Quick Setup (5 minutes)

### Step 1: Generate Supabase Management API Token

1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Create new token"
3. Name: `preview-db-github-actions`
4. Select permissions: `project:create`, `project:read`, `project:delete`
5. Copy the token

### Step 2: Get Organization ID

1. Go to https://supabase.com/dashboard
2. Click your organization name (bottom left)
3. Copy the **Organization ID** from the URL or settings

### Step 3: Add GitHub Secrets

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these secrets:

```
Name: SUPABASE_ACCESS_TOKEN
Value: (paste token from Step 1)

Name: SUPABASE_ORG_ID
Value: (paste org ID from Step 2)
```

### Step 4: Verify Workflows are Enabled

1. Go to repository **Actions** tab
2. Check that these workflows are listed:
   - `Preview Database Create`
   - `Preview Database Tests`
   - `Preview Database Cleanup`
3. If workflows are disabled, click **Enable** on each

### Step 5: Test with a PR

1. Create a new branch and commit
2. Open a PR
3. GitHub Actions will:
   - Create a preview database automatically (~1 min)
   - Post a comment with database URL
   - Run tests (~5-10 min)
   - Post test results

That's it! Preview databases are now automated.

## Advanced Configuration

### Custom Database Region

Edit `.github/workflows/preview-db-create.yml`:

```yaml
REGION="us-east-1"  # Change from ap-southeast-2
```

**Available regions**:
- `us-east-1` (USA)
- `us-west-1` (USA)
- `eu-west-1` (Europe)
- `ap-southeast-1` (Singapore)
- `ap-southeast-2` (Sydney)

### Enable Load Testing on Preview DBs

Add to `.github/workflows/preview-db-tests.yml`:

```yaml
      - name: Run load tests against preview database
        env:
          BASE_URL: ${{ steps.preview_db.outputs.url }}
          API_KEY: ${{ secrets.PREVIEW_DB_API_KEY }}
        run: |
          npm run load:dev
```

### Custom Test Suite

Modify `.github/workflows/preview-db-tests.yml` to run your tests:

```yaml
      - name: Run custom tests
        run: |
          npm run test -- tests/my-specific-tests/
```

### Automatic Cleanup After 24 Hours

Add a new workflow file `.github/workflows/preview-db-auto-cleanup.yml`:

```yaml
name: Auto-cleanup Old Preview DBs

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Delete preview DBs > 24 hours old
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
        run: |
          # Query and delete old preview databases
          # (requires custom script)
```

## Troubleshooting Checklist

### Workflows not running?

- [ ] Workflows are enabled in Actions tab
- [ ] Repository has write permissions for Actions
- [ ] No branch protection rules blocking workflows
- [ ] Check logs in Actions tab for errors

### Secrets not found?

- [ ] Secrets are set in Settings → Secrets and variables
- [ ] Secret names match exactly in workflow files
- [ ] Secrets are in the correct repository (not organization-level)

### Database creation fails?

- [ ] `SUPABASE_ACCESS_TOKEN` is valid (not expired)
- [ ] `SUPABASE_ORG_ID` is correct
- [ ] Organization has available capacity (not exceeding quota)
- [ ] Supabase API is not rate-limited

### Tests timeout?

- [ ] Increase wait timeout from 10 min to 30 min in `preview-db-tests.yml`
- [ ] Check Supabase dashboard for project status
- [ ] Verify database region is correct

### Cannot connect to preview database?

- [ ] Check database URL in workflow output
- [ ] Verify ANON_KEY and SERVICE_ROLE_KEY are set correctly
- [ ] Check network connectivity (VPN, firewall)
- [ ] Verify RLS policies allow connections

## Monitoring

### View Active Preview Databases

```bash
# In Supabase Dashboard
# Projects tab → filter by name prefix "preview-pr-"
```

Or via CLI:
```bash
supabase projects list | grep preview-pr
```

### Check Workflow Status

- GitHub repository → **Actions** tab
- Search for "Preview Database" workflows
- View logs for any failed runs

### Cost Tracking

Check Supabase billing:
1. Dashboard → **Settings** → **Billing**
2. Look for preview project costs
3. Set budget alerts if needed

## Production Readiness Checklist

- [ ] Secrets are configured correctly
- [ ] At least one PR created and tested
- [ ] Test results appear in PR comments
- [ ] Cleanup workflow confirms database deletion
- [ ] No errors in GitHub Actions logs
- [ ] Supabase dashboard shows preview projects created/deleted properly

## Support & Escalation

### Common Issues

| Issue | Solution |
|-------|----------|
| "API token not provided" | Check SUPABASE_ACCESS_TOKEN secret exists |
| "Organization not found" | Verify SUPABASE_ORG_ID is correct |
| "Project creation failed" | Check Supabase API status page |
| "Database connection timeout" | Increase wait timeout, check firewall |

### Additional Resources

- [Supabase API Docs](https://supabase.com/docs/reference/api)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Supabase Status Page](https://status.supabase.com/)

## Next Steps

Once Phase 4 is working:

1. **Phase 5**: Automate production deployment GO/NO-GO gate
2. **Phase 6**: Add compliance evidence collection to workflows
3. **Phase 7**: Multi-region failover testing and disaster recovery

---

**Questions?** Check the logs in the Actions tab or see `PHASE4_PREVIEW_DB_ISOLATION.md` for detailed architecture docs.
