# AI-Firstify Plugin Deployment Guide

## Overview

This guide walks through deploying the AI-Firstify governance plugin to production, including database schema application, type generation, environment configuration, and smoke testing.

## Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- Environment variables configured:
  - `SUPABASE_URL` — Your Supabase project URL
  - `SUPABASE_ANON_KEY` — Anonymous (public) API key
  - `SUPABASE_SERVICE_ROLE_KEY` — Service role key (for admin operations)

## Deployment Steps

### Step 1: Apply Database Migrations

Migrations create the AI-Firstify schema:
- `ai_models` — AI model registry
- `ai_policies` — Governance policies
- `ai_policy_versions` — Policy version history
- `ai_audit_logs` — Immutable audit trail
- RLS policies for org-scoped isolation

**Command:**
```bash
supabase db push --remote
```

**Verification:**
```bash
# List new tables
supabase db list-tables --remote

# Expected output should include:
# - ai_models
# - ai_policies
# - ai_policy_versions
# - ai_audit_logs
```

### Step 2: Generate TypeScript Types

Generate types from the live Supabase schema:

```bash
npm run db:types
```

This updates `lib/database.types.ts` with the actual schema structure. The plugin handlers use these types for type-safe database queries.

### Step 3: TypeScript Check

Verify everything compiles:

```bash
npm run typecheck
```

### Step 4: Run Tests

Run unit tests to verify the plugin:

```bash
npm run test:unit
```

Run integration tests with live Supabase:

```bash
npm run test:integration
```

### Step 5: Build Application

Build Next.js application:

```bash
npm run build
```

### Step 6: Configure Environment

Set plugin environment variables in `.env.local`:

```bash
# Copy template
cp .env.example .env.local

# Edit .env.local with your values:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Plugin-specific settings
AI_FIRSTIFY_API_KEY=your-plugin-api-key
NEXT_PUBLIC_AI_FIRSTIFY_ENDPOINT=https://your-domain.com/api/v1
```

### Step 7: Run Smoke Tests

Verify production readiness:

```bash
npm run smoke:agent-command-gate:live
npm run test:live:db
```

### Step 8: Deploy

Deploy to Vercel:

```bash
# Preview deployment
npm run deploy:preview

# Production deployment
npm run deploy:prod
```

Verify deployment:

```bash
npm run go:no-go https://your-production-url.vercel.app
```

## Automated Deployment Script

Run all steps automatically:

```bash
./scripts/deploy-ai-firstify.sh
```

This script will:
1. Check prerequisites
2. Apply migrations
3. Generate types
4. Verify schema
5. Run TypeScript check
6. Run tests
7. Build application
8. Configure environment
9. Run smoke tests
10. Provide deployment summary

## Troubleshooting

### Migration Conflicts

If migrations have already been applied:

```bash
# Check migration status
supabase migration list --remote

# If idempotent migrations fail, check for:
# - Tables already exist with different schemas
# - RLS policies with conflicting names
```

**Solution:** Drop and reapply migrations or adjust migration SQL for idempotency.

### Type Generation Failed

If `npm run db:types` fails:

```bash
# Verify environment variables
echo $SUPABASE_PROJECT_ID
echo $SUPABASE_URL

# Try manual generation
supabase gen types typescript \
  --project-id $SUPABASE_PROJECT_ID > lib/database.types.ts
```

### Build Failures

If `npm run build` fails:

```bash
# Check for TypeScript errors
npm run typecheck

# Check for missing types
grep -r "any" packages/ai-firstify-plugin/src/

# Verify Supabase client initialization
cat packages/ai-firstify-plugin/src/lib/supabase-client.ts
```

### Tests Failing

If integration tests fail:

```bash
# Run with debug output
npm run test:integration -- --reporter=verbose

# Check test environment
echo "SUPABASE_URL: $SUPABASE_URL"
echo "SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:10}..."

# Verify database connectivity
supabase db list-tables --remote
```

## Rollback

If deployment fails and you need to rollback:

```bash
# Revert to previous commit
git revert <commit-sha>
git push origin main

# Restore database schema (if needed)
supabase db reset --remote
supabase db push --remote
```

## Production Checklist

Before going live in production:

- [ ] Migrations applied and verified
- [ ] TypeScript types generated
- [ ] All tests passing
- [ ] Build successful
- [ ] Environment variables configured
- [ ] Smoke tests passing
- [ ] Vercel deployment ready
- [ ] Production health check passing
- [ ] API keys secured (not in git)
- [ ] Audit logs being created
- [ ] RLS policies enforced

## Monitoring

After deployment, monitor:

1. **API Health**
   ```bash
   curl https://your-production-url/api/health
   ```

2. **Audit Logs**
   - Check Supabase dashboard for new entries in `ai_audit_logs`
   - Verify org_id filtering works
   - Confirm RLS policies block unauthorized access

3. **Policy Evaluation**
   - Test governance gates with test payloads
   - Verify decisions are logged
   - Check proof references are captured

4. **Performance**
   - Monitor query performance on large audit logs
   - Consider partitioning if logs grow large
   - Index optimization may be needed

## Next Steps

1. Monitor production metrics and logs
2. Gradually increase traffic to new plugin
3. Collect user feedback on governance decisions
4. Optimize policy rules based on usage patterns
5. Plan Phase 3: Integration with additional services

## Support

For issues or questions:

- Check migration logs: `supabase migration list --remote --verbose`
- Review audit logs in Supabase dashboard
- Check Vercel deployment logs
- Review CLAUDE.md for coding guidelines
