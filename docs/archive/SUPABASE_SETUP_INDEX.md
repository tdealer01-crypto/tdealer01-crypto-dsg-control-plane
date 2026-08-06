# Supabase Database Setup and Migration Index

Complete reference guide for all Supabase setup documentation and scripts created for DSG Control Plane.

---

## Quick Start

**For production deployment:**
1. Read: `docs/DEPLOYMENT_SUPABASE_SETUP.md` (sections 1-3)
2. Run: `scripts/setup-supabase-local.sh link <PROJECT_REF>`
3. Apply: `supabase db push`
4. Verify: `scripts/verify-supabase-schema.sql` (copy/paste in SQL Editor)

**Estimated time:** 10-15 minutes

---

## Documentation Files

### 1. `docs/DEPLOYMENT_SUPABASE_SETUP.md` (567 lines)

**Purpose:** Complete Supabase project setup and deployment guide.

**Covers:**
- Supabase project creation (cloud or local)
- Database connection details extraction
- Environment variables configuration
- Migration file overview (especially `20260606185643_stripe_app_tables.sql`)
- Step-by-step migration application (3 methods)
- RLS policy verification with SQL queries
- Table structure verification
- Troubleshooting common issues
- Post-migration checklist

**For whom:** DevOps engineers, platform engineers, first-time Supabase users.

**When to use:**
- Setting up a new Supabase project
- Configuring production environment variables
- Verifying migrations are correctly applied
- Troubleshooting migration failures

**Key sections:**
- Section 2: Database Connection Details Extraction
- Section 3: Migration File Overview (Stripe governance tables)
- Section 4: Step-by-Step Migration Application
- Section 6: RLS Policy Verification Checklist
- Section 8: Troubleshooting

---

### 2. `docs/SUPABASE_MIGRATION_GUIDE.md` (659 lines)

**Purpose:** Three methods for executing migrations with detailed step-by-step instructions.

**Covers:**
- Method 1: Supabase CLI (recommended)
- Method 2: Supabase Dashboard SQL Editor
- Method 3: Direct PostgreSQL connection
- RLS policy explanation and verification
- Comprehensive troubleshooting (11 error scenarios)
- Migration reversal (development only)
- Next steps after migration

**For whom:** Database administrators, developers applying migrations, CI/CD engineers.

**When to use:**
- Running migrations for the first time
- Debugging migration failures
- Understanding RLS policy behavior
- Choosing between CLI, dashboard, or direct database access

**Key sections:**
- Method 1: Supabase CLI (Recommended) — fastest and most reliable
- Method 2: Dashboard SQL Editor — GUI alternative
- Method 3: Direct PostgreSQL — for advanced users
- RLS Policy Explanation and Verification
- Troubleshooting (11 specific error messages)

**Methods comparison:**
| Method | Speed | Reliability | Best For |
|--------|-------|-------------|----------|
| CLI | Fast | High | Automated CI/CD, batch operations |
| Dashboard | Slow | Medium | First-time users, visual verification |
| PostgreSQL | Medium | High | Direct DB access, custom scripts |

---

### 3. `docs/DEPLOYMENT_SUPABASE_SETUP.md` vs `docs/SUPABASE_MIGRATION_GUIDE.md`

**Which to read first?**

- **Start with DEPLOYMENT_SUPABASE_SETUP.md if:**
  - Setting up a completely new environment
  - Configuring environment variables
  - Understanding what migrations do
  - First time working with Supabase

- **Start with SUPABASE_MIGRATION_GUIDE.md if:**
  - Project is already created and linked
  - Need to execute migrations
  - Troubleshooting specific errors
  - Comparing execution methods

**Both documents reference each other.**

---

## Script Files

### 1. `scripts/verify-supabase-schema.sql` (419 lines)

**Purpose:** SQL verification queries to confirm migration success.

**Use cases:**
- Verify tables exist after migration
- Check indexes are created
- Verify RLS policies are enabled
- Get table row counts
- Export full table schema
- Verify foreign keys and constraints
- Performance analysis

**How to use:**
1. Open Supabase Dashboard → SQL Editor
2. Copy relevant sections from this file
3. Paste and execute
4. Verify results match expected output

**Sections:**
1. Table Existence Checks (3 queries)
2. Index Verification (3 queries)
3. RLS Policy Verification (3 queries)
4. Row Counts (2 queries)
5. Full Table Schema (4 queries)
6. Constraints and Foreign Keys (3 queries)
7. Default Values and Sequences (2 queries)
8. Performance and Space Analysis (2 queries)
9. Migration Verification Summary (1 query)
10. Example Data Queries (3 queries)

**Output:** Detailed verification report confirming:
- ✓ All 3 tables exist
- ✓ All 8 indexes created
- ✓ All 3 RLS policies enabled
- ✓ All foreign keys configured
- ✓ No errors in table structure

---

### 2. `scripts/setup-supabase-local.sh` (429 lines, executable)

**Purpose:** Interactive Bash script to link local project, check migration status, and apply migrations.

**Features:**
- Interactive menu for beginners
- Command-line interface for automation
- Prerequisite checking (CLI installed, repo structure)
- Authentication verification
- Project linking
- Migration status reporting
- One-command migration push
- Database connection verification
- Colored output for readability
- Comprehensive error messages

**How to use:**

**Interactive mode (no arguments):**
```bash
./scripts/setup-supabase-local.sh
# Shows menu with 6 options
```

**Command mode (scripted):**
```bash
# Link to a specific project
./scripts/setup-supabase-local.sh link abcdefghijk

# Check migration status
./scripts/setup-supabase-local.sh status

# Apply pending migrations
./scripts/setup-supabase-local.sh push

# Verify database connection
./scripts/setup-supabase-local.sh verify-connection

# Show help
./scripts/setup-supabase-local.sh help
```

**Features breakdown:**

| Feature | Command | Purpose |
|---------|---------|---------|
| Link project | `link <REF>` | Connect to remote Supabase |
| Check status | `status` | See which migrations are pending |
| List migrations | `list` | Show all local migration files |
| Apply migrations | `push` | Apply all pending migrations (with confirmation) |
| Verify connection | `verify-connection` | Test database connectivity |
| Interactive mode | (no args) | Guided menu for all operations |
| Help | `help` | Show usage instructions |

**Exit codes:**
- `0` — Success
- `1` — Error (details printed to stderr)

---

## Related Documentation

### Existing Files (Reference)

- `docs/RUNBOOK_DEPLOY.md` — Complete deployment checklist including migration order
- `CLAUDE.md` (CLAUDE.md) — Project-wide guidance including Supabase conventions
- `supabase/migrations/` — All 56 migration files in chronological order
- `supabase/schema.sql` — Schema snapshot (reference only)

### TypeScript Integration

- `lib/database.types.ts` — Auto-generated types from Supabase schema
- Regenerate after migrations: `npm run db:types`

---

## Workflow Examples

### Example 1: Initial Setup (New Project)

```bash
# 1. Create Supabase project (via dashboard)
# 2. Get project reference (PROJECT_REF)

# 3. Link local environment
./scripts/setup-supabase-local.sh link PROJECT_REF

# 4. Check status
./scripts/setup-supabase-local.sh status

# 5. Apply all migrations
./scripts/setup-supabase-local.sh push

# 6. Verify
./scripts/setup-supabase-local.sh verify-connection

# 7. Generate TypeScript types
npm run db:types

# 8. Build and test
npm run build
npm test
```

### Example 2: Migration Debugging

```bash
# 1. Check which migrations are failing
./scripts/setup-supabase-local.sh status

# 2. Review migration file
cat supabase/migrations/20260606185643_stripe_app_tables.sql

# 3. Read troubleshooting section in docs/SUPABASE_MIGRATION_GUIDE.md

# 4. Open SQL Editor and test manually
# Copy relevant sections from scripts/verify-supabase-schema.sql

# 5. If successful, apply with CLI
./scripts/setup-supabase-local.sh push
```

### Example 3: Production Deployment

See `docs/DEPLOYMENT_SUPABASE_SETUP.md` sections 1-3, then:

```bash
# 1. Verify environment variables in Vercel
vercel env ls production

# 2. Link to production project (local machine only)
./scripts/setup-supabase-local.sh link PROD_PROJECT_REF

# 3. Check migration status
./scripts/setup-supabase-local.sh status

# 4. Apply migrations to production database
./scripts/setup-supabase-local.sh push

# 5. Verify schema in Supabase dashboard
# Copy verify-supabase-schema.sql queries

# 6. Deploy application
vercel --prod

# 7. Run production health checks
curl -fsSL "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health"
```

---

## Key Migration: Stripe Governance (2026-06-06)

**File:** `supabase/migrations/20260606185643_stripe_app_tables.sql`

**What it creates:**

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `stripe_app_accounts` | Link Stripe accounts to DSG orgs | `stripe_account_id`, `dsg_org_id`, `status` |
| `stripe_operation_policies` | Governance rules per account | `operation_type`, `conditions`, `action` |
| `stripe_operation_audits` | Audit trail of Stripe events | `stripe_event_id`, `dsg_decision`, `status` |

**RLS Policies:**
- Organization members can only view their org's Stripe accounts
- All three tables enforce organization-based access control

**Indexes (8 total):**
- Account lookups, status filtering, policy querying, audit time-range queries

---

## Troubleshooting Quick Reference

| Error | Solution |
|-------|----------|
| "Relation already exists" | Migration already applied; safe to skip |
| "No such table" | Missing prerequisite migration; apply in order |
| "Permission denied" | Use service role key, not anon key |
| "Connection timeout" | Check internet, project not paused |
| "Supabase CLI not found" | Install: `npm install -g @supabase/cli` |
| "Project not linked" | Run: `./scripts/setup-supabase-local.sh link <REF>` |
| "Migration list shows nothing" | Not in repo root; verify: `ls supabase/migrations/` |

For complete troubleshooting, see:
- `docs/DEPLOYMENT_SUPABASE_SETUP.md` section 8
- `docs/SUPABASE_MIGRATION_GUIDE.md` troubleshooting section

---

## Environment Variables

Required for application:

```bash
# From Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# For Vercel
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

See `docs/DEPLOYMENT_SUPABASE_SETUP.md` section 2.3 for details.

---

## Verification Checklist

After all setup and migrations:

```
[ ] Supabase project created and linked
[ ] Environment variables configured in Vercel
[ ] All migrations applied (supabase migration list)
[ ] Tables exist (query: SELECT COUNT(*) FROM stripe_app_accounts;)
[ ] Indexes created (verify-supabase-schema.sql section 2)
[ ] RLS policies enabled (verify-supabase-schema.sql section 3)
[ ] Foreign keys configured (verify-supabase-schema.sql section 6)
[ ] TypeScript types regenerated (npm run db:types)
[ ] Application builds successfully (npm run build)
[ ] Tests pass (npm test)
[ ] Health endpoint responds (curl /api/health)
[ ] Production deployment ready
```

---

## File Sizes and Line Counts

| File | Type | Size | Lines | Purpose |
|------|------|------|-------|---------|
| `DEPLOYMENT_SUPABASE_SETUP.md` | Markdown | 15 KB | 567 | Supabase setup guide |
| `SUPABASE_MIGRATION_GUIDE.md` | Markdown | 16 KB | 659 | Migration execution (3 methods) |
| `verify-supabase-schema.sql` | SQL | 13 KB | 419 | Schema verification queries |
| `setup-supabase-local.sh` | Bash | 12 KB | 429 | Local setup helper script |
| **Total** | — | **56 KB** | **2,074** | Complete reference |

---

## Next Steps After Setup

1. **Configure Stripe integration:**
   - Set Stripe API keys in Supabase `dsg_secrets`
   - Configure webhook endpoint to `/api/webhooks/stripe`

2. **Deploy application:**
   ```bash
   npm run build
   npm run start  # or: vercel --prod
   ```

3. **Monitor schema health:**
   - Regularly run `verify-supabase-schema.sql` queries
   - Check `stripe_operation_audits` for Stripe event records

4. **Maintain migrations:**
   - Keep migrations in `supabase/migrations/` versioned
   - Always apply in order by filename
   - Document schema changes in comments

---

## Support and References

- **Supabase Docs:** https://supabase.com/docs
- **CLI Guide:** https://supabase.com/docs/guides/cli
- **Migrations Guide:** https://supabase.com/docs/guides/migrations
- **PostgreSQL RLS:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html

---

## Document History

Created: 2026-06-07
Migration version: 20260606185643_stripe_app_tables.sql
Total migrations: 56 (as of 2026-06-06)

All guides are current and tested against the latest migration suite.
