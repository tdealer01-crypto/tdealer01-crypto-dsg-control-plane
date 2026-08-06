# Supabase Database Setup and Deployment Guide

This guide covers Supabase project creation, database connection, and migration execution for the DSG Control Plane.

## Overview

The Control Plane uses Supabase (PostgreSQL + PostgREST API) for persistent storage. Migrations are versioned and applied in strict order to ensure schema consistency.

Current production Supabase URL: `https://tdealer01-crypto-dsg-control-plane.vercel.app`

**Key migration:** `20260606185643_stripe_app_tables.sql` introduces Stripe governance tables.

---

## 1. Supabase Project Creation and Linking

### Option A: Existing Project (Production/Staging)

If you already have a Supabase project:

1. Open [supabase.com/dashboard](https://supabase.com/dashboard)
2. Navigate to your project
3. Copy the project reference (e.g., `abcdefghijklmno`)
4. Copy the API keys:
   - `NEXT_PUBLIC_SUPABASE_URL` → Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` → Service role key (server-side only)

### Option B: New Project Setup

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Configure:
   - **Name:** e.g., `dsg-control-plane-prod`
   - **Database Password:** secure 32+ char password
   - **Region:** closest to your users/infrastructure (e.g., `us-east-1`)
   - **Pricing Plan:** Pro or higher for production
4. Wait for project initialization (2–5 minutes)
5. Copy connection details (see section 2 below)

### Option C: Local Development with Supabase CLI

For local testing:

```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Initialize local Supabase
supabase init

# Start local Supabase server
supabase start

# Link to a remote project (optional, for preview deployments)
supabase link --project-ref <PROJECT_REF>

# Stop local Supabase
supabase stop
```

---

## 2. Database Connection Details Extraction

### From Supabase Dashboard

1. Open your Supabase project dashboard
2. **Settings → API** → Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

### From Supabase CLI

```bash
supabase projects list
supabase projects describe --project-ref <PROJECT_REF>
```

### Environment Variables Setup

Create `.env.local` for local development:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

For Vercel production:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

---

## 3. Migration File Overview

### Location

All migrations are in: `/supabase/migrations/`

### Recent Critical Migration

**File:** `20260606185643_stripe_app_tables.sql`

**What it does:**
- Creates `stripe_app_accounts` table (links Stripe accounts to DSG orgs)
- Creates `stripe_operation_policies` table (governance rules for charges/payouts/refunds)
- Creates `stripe_operation_audits` table (audit trail of Stripe events + DSG decisions)
- Adds 6 performance indexes
- Enables Row-Level Security (RLS) policies
- Restricts access by organization membership

**Critical tables created:**
- `stripe_app_accounts` — Stripe account registration per org
- `stripe_operation_policies` — Operation-type rules (charge, payout, refund, payment_intent)
- `stripe_operation_audits` — Decision audit trail with Stripe event tracing

**Row-level security:** Organization members can only view/modify their own Stripe accounts and related data.

---

## 4. Step-by-Step Migration Application

### Method 1: Supabase CLI (Recommended)

Requires Supabase CLI and a linked project.

#### 4.1.1 Link Your Project

```bash
supabase link --project-ref <PROJECT_REF>
```

Replace `<PROJECT_REF>` with your project reference (e.g., `abcdefghijklmno`).

When prompted, provide your database password.

#### 4.1.2 Check Migration Status

```bash
supabase migration list
```

Output shows which migrations are already applied. If migrations exist locally but not remotely, you will see pending migrations.

#### 4.1.3 Apply All Pending Migrations

```bash
supabase db push
```

This command:
- Finds all local migrations not yet applied remotely
- Applies them in order by filename (timestamp order)
- Reports success or error for each migration

#### 4.1.4 Verify Success

```bash
supabase migration list
```

All migrations should show status `Applied`. If any show pending, revisit the push output for error details.

### Method 2: Supabase Dashboard (Manual SQL Editor)

Use this when CLI is unavailable.

#### 4.2.1 Open SQL Editor

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Open your project
3. **SQL Editor** in left sidebar

#### 4.2.2 Load and Run Migration SQL

For each migration file (in alphabetical order):

1. Open the migration file (e.g., `20260606185643_stripe_app_tables.sql`)
2. Copy entire SQL content
3. Paste into SQL Editor in Supabase dashboard
4. Click **Run** (or Cmd+Enter)
5. Confirm execution and check for errors

**Important:** Always apply migrations in order by filename (timestamps ensure correct order).

#### 4.2.3 Verify Table Creation

After each migration, run this verification query:

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

Confirm the new tables appear in results.

### Method 3: Direct PostgreSQL Connection

For advanced users with direct database access:

```bash
# Export connection string
psql "<SUPABASE_CONNECTION_STRING>" -f supabase/migrations/20260606185643_stripe_app_tables.sql
```

Replace `<SUPABASE_CONNECTION_STRING>` with your database connection string from Supabase settings.

---

## 5. RLS Policy Verification Checklist

After migrations are applied, verify Row-Level Security policies are active.

### 5.1 Check RLS Enabled on Tables

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN (
  'stripe_app_accounts',
  'stripe_operation_policies',
  'stripe_operation_audits'
)
ORDER BY tablename;
```

Expected output: all three tables should have `rowsecurity = true`.

### 5.2 Verify RLS Policies Exist

```sql
SELECT tablename, policyname, QUAL
FROM pg_policies
WHERE tablename IN (
  'stripe_app_accounts',
  'stripe_operation_policies',
  'stripe_operation_audits'
);
```

Expected: three policies should exist:
- `stripe_app_accounts_org_access`
- `stripe_operation_policies_org_access`
- `stripe_operation_audits_org_access`

### 5.3 Test RLS Policy (as unauthenticated user)

```sql
SET ROLE anon;
SELECT COUNT(*) FROM stripe_app_accounts;
RESET ROLE;
```

Expected: returns `0` (anon user has no access).

### 5.4 Test RLS Policy (as authenticated user)

```sql
-- Simulate authenticated user with org membership
SET ROLE authenticated;
SET auth.uid = '<valid-user-uuid>';
SELECT COUNT(*) FROM stripe_app_accounts;
RESET ROLE;
```

Expected: returns count of accounts accessible to that user's organizations.

---

## 6. Table Verification Queries

Use these queries to confirm the migration completed successfully.

### 6.1 Check Table Existence and Structure

```sql
-- Check stripe_app_accounts
\d stripe_app_accounts

-- Check stripe_operation_policies
\d stripe_operation_policies

-- Check stripe_operation_audits
\d stripe_operation_audits
```

### 6.2 Verify All Indexes

```sql
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN (
  'stripe_app_accounts',
  'stripe_operation_policies',
  'stripe_operation_audits'
)
ORDER BY tablename, indexname;
```

Expected indexes (at minimum):
- `idx_stripe_app_accounts_org_id`
- `idx_stripe_app_accounts_status`
- `idx_stripe_operation_policies_account`
- `idx_stripe_operation_policies_operation`
- `idx_stripe_operation_audits_account`
- `idx_stripe_operation_audits_created`
- `idx_stripe_operation_audits_decision`
- `idx_stripe_operation_audits_account_created`

### 6.3 Check Column Constraints

```sql
SELECT
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name IN (
  'stripe_app_accounts',
  'stripe_operation_policies',
  'stripe_operation_audits'
)
ORDER BY table_name, constraint_name;
```

Expected:
- `stripe_app_accounts` has PRIMARY KEY and UNIQUE constraint on `stripe_account_id`
- `stripe_operation_policies` has PRIMARY KEY and FOREIGN KEY to `stripe_app_accounts`
- `stripe_operation_audits` has PRIMARY KEY and UNIQUE on `stripe_event_id`

### 6.4 Verify Foreign Keys

```sql
SELECT
  constraint_name,
  table_name,
  column_name
FROM information_schema.key_column_usage
WHERE table_name IN (
  'stripe_app_accounts',
  'stripe_operation_policies',
  'stripe_operation_audits'
)
  AND constraint_name LIKE '%_fk'
ORDER BY table_name, constraint_name;
```

Expected:
- `stripe_operation_policies` → `stripe_app_accounts` (via `stripe_account_id`)
- `stripe_operation_audits` → `stripe_app_accounts` (via `stripe_account_id`)
- `stripe_app_accounts` → `organizations` (via `dsg_org_id`)

### 6.5 Show Row Counts

```sql
SELECT
  'stripe_app_accounts' AS table_name,
  COUNT(*) AS row_count
FROM stripe_app_accounts

UNION ALL

SELECT
  'stripe_operation_policies' AS table_name,
  COUNT(*) AS row_count
FROM stripe_operation_policies

UNION ALL

SELECT
  'stripe_operation_audits' AS table_name,
  COUNT(*) AS row_count
FROM stripe_operation_audits;
```

Expected: rows will be 0 initially (until Stripe events are recorded).

### 6.6 Full Table Schema Dump

```sql
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'stripe_app_accounts',
    'stripe_operation_policies',
    'stripe_operation_audits'
  )
ORDER BY table_name, ordinal_position;
```

Expected columns per table:

**stripe_app_accounts:**
- `id` (UUID, PK)
- `stripe_account_id` (TEXT, UNIQUE)
- `dsg_org_id` (TEXT, FK)
- `stripe_api_key_encrypted` (TEXT, nullable)
- `fail_safe_mode` (TEXT, default 'fail_open')
- `status` (TEXT, default 'active')
- `installed_at` (TIMESTAMP, default NOW())
- `updated_at` (TIMESTAMP, default NOW())
- `metadata` (JSONB, default '{}')

**stripe_operation_policies:**
- `id` (UUID, PK)
- `stripe_account_id` (TEXT, FK)
- `operation_type` (TEXT)
- `rule_type` (TEXT, nullable)
- `conditions` (JSONB)
- `action` (TEXT)
- `enabled` (BOOLEAN, default true)
- `created_at` (TIMESTAMP, default NOW())
- `updated_at` (TIMESTAMP, default NOW())

**stripe_operation_audits:**
- `id` (UUID, PK)
- `stripe_account_id` (TEXT, FK)
- `stripe_event_id` (TEXT, UNIQUE)
- `stripe_object_id` (TEXT)
- `operation_type` (TEXT)
- `dsg_decision_id` (TEXT, nullable)
- `dsg_decision` (TEXT, nullable)
- `dsg_reason` (TEXT, nullable)
- `dsg_proof` (TEXT, nullable)
- `payload` (JSONB, nullable)
- `status` (TEXT, default 'recorded')
- `created_at` (TIMESTAMP, default NOW())

---

## 7. Connection String Reference

### From Supabase Dashboard

Navigate to **Settings → Database → Connection String** and copy one of:

- **User Session** (for client-side, anon key): includes `role=anon`
- **Service Role** (for server-side, service key): includes `role=service_role`

### Format

```
postgresql://[user[:password]@][host][:port][/database][?param1=value1&...]
```

### Example (Production)

```
postgresql://postgres:[password]@db.abcdefghijk.supabase.co:5432/postgres
```

Do NOT commit connection strings with credentials. Use environment variables instead.

---

## 8. Troubleshooting

### Migration Push Fails with "Permission Denied"

**Cause:** Service role key is missing or incorrect.

**Solution:**
1. Verify `SUPABASE_SERVICE_ROLE_KEY` is set and correct
2. Copy fresh key from Supabase dashboard → Settings → API
3. Run `supabase link --project-ref <PROJECT_REF>` again
4. Try `supabase db push` again

### Migration Fails with "Relation Already Exists"

**Cause:** Migration was partially applied or already applied.

**Solution:**
1. Check `supabase migration list` to confirm which are applied
2. If the migration is already applied, no action needed
3. If partially applied, contact Supabase support to manually remove the incomplete state
4. Re-run `supabase db push`

### Foreign Key Constraint Violations During Migration

**Cause:** Referenced tables (e.g., `organizations`, `org_members`) do not exist.

**Solution:**
1. Ensure all prerequisite migrations are applied first
2. Check that migrations are applied in correct filename order
3. Verify `organizations` and `org_members` tables exist:
   ```sql
   SELECT COUNT(*) FROM organizations;
   SELECT COUNT(*) FROM org_members;
   ```
4. If missing, find and apply the migration that creates them
5. Retry the failed migration

### "No Such Function" Error During Migration

**Cause:** RLS policies reference functions that don't exist.

**Solution:**
1. Check that all prerequisite migrations have been applied
2. Look for migrations that create utility functions (e.g., `runtime_commit_execution`)
3. Apply those migrations first
4. Then retry the current migration

### Connection Timeout During Migration

**Cause:** Network or database connection issue.

**Solution:**
1. Verify you have internet access
2. Verify Supabase project is not paused (check dashboard)
3. Re-run `supabase link --project-ref <PROJECT_REF>` to refresh connection
4. Try `supabase db push` again with reduced transaction size (if supported)
5. As fallback, apply migration manually via SQL Editor (Method 2)

---

## 9. Post-Migration Verification Checklist

After running migrations:

- [ ] All migration files applied (check `supabase migration list`)
- [ ] Three new tables exist: `stripe_app_accounts`, `stripe_operation_policies`, `stripe_operation_audits`
- [ ] All 8 indexes created (check with index verification query)
- [ ] All foreign key constraints present
- [ ] RLS enabled on all three tables
- [ ] RLS policies created (three policies total)
- [ ] Row counts can be queried (even if zero rows initially)
- [ ] No errors in application logs after deploy
- [ ] Stripe webhook handler can insert records into audit table

---

## 10. Next Steps

After migrations are applied:

1. **Generate TypeScript types:** `npm run db:types`
2. **Deploy application:** `npm run build && npm run start`
3. **Verify API routes:** `curl https://your-app/api/health`
4. **Test Stripe integration:** Configure Stripe webhook to point to `/api/webhooks/stripe`
5. **Monitor audit logs:** Query `stripe_operation_audits` after first Stripe event

---

## Reference: All Migration Files (2026-06-06)

Total: 56 migrations across 8+ months of product evolution.

Critical recent migrations:
- `20260604_hermes_managed_agents.sql` — Hermes agent framework tables
- `20260606185643_stripe_app_tables.sql` — Stripe governance (current)

See `docs/RUNBOOK_DEPLOY.md` for complete ordered list of all 56 migrations.
