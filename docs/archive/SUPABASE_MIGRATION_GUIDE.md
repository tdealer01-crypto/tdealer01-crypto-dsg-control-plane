# Supabase Migration Execution Guide

Complete step-by-step instructions for applying Supabase migrations using CLI, Dashboard, or direct PostgreSQL access.

---

## Overview

Migrations transform the database schema in a reproducible, version-controlled manner. Each migration is a SQL file that:
- Creates or modifies tables
- Adds indexes for performance
- Configures Row-Level Security (RLS) policies
- Establishes foreign key relationships

**Critical migration for Stripe governance:** `20260606185643_stripe_app_tables.sql`

---

## Method 1: Supabase CLI (Recommended)

The CLI is the fastest and most reliable method. It automatically:
- Determines which migrations are pending
- Applies them in correct order
- Reports detailed error messages if something fails

### Prerequisites

1. **Install Supabase CLI**

   ```bash
   npm install -g @supabase/cli
   ```

   Or for macOS:

   ```bash
   brew install supabase/tap/supabase
   ```

   Verify installation:

   ```bash
   supabase --version
   ```

2. **Have your Supabase project reference ready**

   - From Supabase dashboard: **Settings → General → Reference ID**
   - Example: `abcdefghijklmno`

3. **Have your Supabase database password**

   - Set when creating the project
   - Stored securely (never commit to repo)

### Step 1: Verify Supabase CLI Access

```bash
supabase projects list
```

This confirms you have proper authentication. If it fails:
- Check you are logged in: `supabase auth list`
- Re-authenticate: `supabase login`

### Step 2: Link Your Project

```bash
supabase link --project-ref <PROJECT_REF>
```

Replace `<PROJECT_REF>` with your actual reference ID.

When prompted:
- **Database password:** enter your Supabase database password
- **Confirm linking:** select `Y`

Example:

```bash
supabase link --project-ref abcdefghijk
# ✓ Linked to project abcdefghijk
# ✓ Saved connection string to .env.local
```

### Step 3: Check Migration Status

```bash
supabase migration list
```

Output shows:
- **Applied:** migrations already applied to the production database
- **Pending:** migrations in your local `supabase/migrations/` folder not yet applied

Example output:

```
# Pending migrations
20260606185643_stripe_app_tables.sql

# Applied migrations
20260604_hermes_managed_agents.sql
20260603001000_breach_signal_evaluations.sql
...
```

### Step 4: Apply All Pending Migrations

```bash
supabase db push
```

This command:
1. Finds all pending migrations
2. Applies them to the remote database in order
3. Shows progress for each migration
4. Reports success or error

Example output:

```
Pushing migrations...
  20260606185643_stripe_app_tables.sql ... ok
All migrations pushed successfully.
```

**Important:** Do not interrupt this process. If it fails, see troubleshooting section below.

### Step 5: Verify Success

```bash
supabase migration list
```

Expected: All migrations now show as **Applied**. No pending migrations should remain.

Verify the new tables exist:

```sql
SELECT tablename FROM information_schema.tables WHERE table_schema = 'public';
```

You should see:
- `stripe_app_accounts`
- `stripe_operation_policies`
- `stripe_operation_audits`

---

## Method 2: Supabase Dashboard (Manual SQL Editor)

Use this method when CLI is unavailable or you prefer a visual interface.

### Prerequisites

1. Access to Supabase dashboard
2. Your Supabase project open
3. SQL files available (from `/supabase/migrations/`)

### Step 1: Open SQL Editor

1. Log in to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Open your project
3. Click **SQL Editor** in the left sidebar

### Step 2: Create a New Query

1. Click **New Query**
2. Give it a name (e.g., "Apply Migration 20260606185643")

### Step 3: Copy Migration SQL

1. Open the migration file: `supabase/migrations/20260606185643_stripe_app_tables.sql`
2. Copy the entire SQL content
3. Paste into the SQL Editor in Supabase

Example (truncated for readability):

```sql
-- Stripe App Governance Tables
-- Phase 3: Database & Persistence Layer

-- 1. stripe_app_accounts: Link Stripe accounts to DSG orgs
CREATE TABLE stripe_app_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_account_id TEXT UNIQUE NOT NULL,
  ...
);

-- RLS Policy
CREATE POLICY stripe_app_accounts_org_access
  ON stripe_app_accounts
  USING (...);

...
```

### Step 4: Execute Migration

1. Click **Run** button (or press Ctrl+Enter / Cmd+Enter)
2. Wait for execution to complete (typically <5 seconds for most migrations)
3. Check for success message at the bottom:
   - ✓ "Migration executed successfully" (or similar)
   - ✗ Error message with specific problem

**If successful:** The query shows a green checkmark.

**If error:** The error message explains what failed. Common errors are listed in the troubleshooting section.

### Step 5: Verify Results

Execute verification queries in the same SQL Editor:

```sql
-- Check if table was created
SELECT COUNT(*) FROM stripe_app_accounts;
```

Expected: `0` rows initially (table is empty).

### Step 6: Repeat for All Pending Migrations

If multiple migrations are pending:

1. Note the complete list of pending migrations
2. Apply them in order by filename (timestamps ensure correct order)
3. For each migration:
   - Create new query
   - Copy migration SQL
   - Execute
   - Verify success

**Critical:** Always apply migrations in alphabetical/timestamp order. Applying out of order can cause:
- Foreign key violations
- Function not found errors
- RLS policy failures

---

## Method 3: Direct PostgreSQL Connection

For advanced users or when GUI tools are unavailable.

### Prerequisites

1. PostgreSQL client installed (`psql` command available)
2. Connection string from Supabase:
   - Dashboard → Settings → Database → Connection String
   - Copy the connection string (user session or service role)

### Step 1: Set Connection String

```bash
export SUPABASE_CONNECTION_STRING="postgresql://postgres:[password]@db.abcdefghijk.supabase.co:5432/postgres"
```

Replace placeholders with your actual credentials.

**Warning:** Never commit connection strings with credentials to version control.

### Step 2: Apply Single Migration

```bash
psql "$SUPABASE_CONNECTION_STRING" -f supabase/migrations/20260606185643_stripe_app_tables.sql
```

Expected output:

```
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
...
CREATE POLICY
```

No errors should appear.

### Step 3: Apply All Pending Migrations

To apply all migrations in order:

```bash
for file in supabase/migrations/*.sql; do
  echo "Applying: $file"
  psql "$SUPABASE_CONNECTION_STRING" -f "$file" || {
    echo "FAILED: $file"
    exit 1
  }
done
```

This script:
1. Iterates through all migrations in order
2. Applies each one
3. Stops on first error
4. Reports which file failed

### Step 4: Verify Success

```bash
psql "$SUPABASE_CONNECTION_STRING" -c "SELECT COUNT(*) FROM stripe_app_accounts;"
```

Expected output:

```
 count
-------
     0
(1 row)
```

---

## RLS Policy Explanation

RLS (Row-Level Security) ensures users can only access data they are authorized for.

### How Stripe RLS Works

The migration creates three RLS policies:

#### 1. `stripe_app_accounts_org_access`

**Rule:** Users can only view Stripe accounts registered to organizations they are a member of.

```sql
-- User can view stripe account if they are a member of the account's organization
USING (
  auth.uid() IS NOT NULL AND
  dsg_org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  )
)
```

**Example:**
- User A is a member of Organization X
- User A can access Stripe accounts linked to Organization X
- User A cannot access Stripe accounts linked to Organization Y

#### 2. `stripe_operation_policies_org_access`

**Rule:** Policies are accessible only if the underlying Stripe account is accessible.

```sql
-- User can view policy if they have access to the associated Stripe account
USING (
  stripe_account_id IN (
    SELECT stripe_account_id FROM stripe_app_accounts
    WHERE dsg_org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  )
)
```

#### 3. `stripe_operation_audits_org_access`

**Rule:** Audit records are accessible only if the underlying Stripe account is accessible.

Similar structure to policies RLS.

### RLS Policy Verification

Verify policies are active:

```bash
# Via CLI
supabase db push

# Via Dashboard
SELECT * FROM pg_policies
WHERE tablename IN (
  'stripe_app_accounts',
  'stripe_operation_policies',
  'stripe_operation_audits'
);
```

Test as unauthenticated user (should see nothing):

```sql
SET ROLE anon;
SELECT * FROM stripe_app_accounts; -- Returns 0 rows
RESET ROLE;
```

Test as authenticated user (should see their org's accounts):

```sql
SET auth.uid = 'valid-user-uuid';
SET ROLE authenticated;
SELECT * FROM stripe_app_accounts; -- Returns accounts accessible to this user
RESET ROLE;
```

---

## Troubleshooting

### Error: "Relation Already Exists"

**Message:**
```
ERROR: relation "stripe_app_accounts" already exists
```

**Cause:** The migration has already been applied to this database.

**Solution:**
1. Run `supabase migration list` to confirm
2. If migration shows "Applied", it's safe to skip
3. If you need to reset: contact Supabase support

### Error: "No Such Table" or Foreign Key Violation

**Message:**
```
ERROR: relation "organizations" does not exist
```

**Cause:** A prerequisite migration was not applied.

**Solution:**
1. Check which migrations are applied: `supabase migration list`
2. Identify missing prerequisites (check migration SQL comments)
3. Apply missing migrations in order: `supabase db push`
4. Retry the failed migration

### Error: "Permission Denied"

**Message:**
```
ERROR: Permission denied for schema public
```

**Cause:** Your database credentials don't have proper privileges.

**Solution:**
1. Verify you're using the **service role** key or database password (not anon key)
2. Confirm credentials in Supabase dashboard: Settings → API
3. Re-authenticate: `supabase login`
4. Re-link project: `supabase link --project-ref <PROJECT_REF>`

### Error: "Connection Timeout"

**Message:**
```
timeout waiting for connection pool
```

**Cause:** Network or database connectivity issue.

**Solutions:**
1. Check internet connection
2. Verify Supabase project is not paused (dashboard → Settings)
3. Try again (may be temporary)
4. Use dashboard SQL Editor as fallback

### Error: "Migration List Shows Nothing"

**Message:**
```
No migrations found
```

**Cause:** Project is not linked, or migrations folder doesn't exist.

**Solution:**
1. Verify you're in the repository root: `pwd`
2. Check migrations exist: `ls supabase/migrations/`
3. Link project: `supabase link --project-ref <PROJECT_REF>`

### Error: "Database Password Rejected"

**Message:**
```
FATAL: password authentication failed
```

**Cause:** Wrong database password provided during linking.

**Solution:**
1. Verify password from Supabase dashboard
2. Unlink project: `supabase unlink`
3. Re-link with correct password: `supabase link --project-ref <PROJECT_REF>`

### Migration Partially Applied (Inconsistent State)

**Symptom:** Some tables exist, some don't. Error says table already exists but RLS policy doesn't.

**Cause:** Migration execution was interrupted or partially failed.

**Solution:**
1. Check applied migrations: `supabase migration list`
2. Identify which parts were applied (query tables individually)
3. Contact Supabase support or manually remove incomplete state:
   ```sql
   -- DO NOT do this without Supabase support guidance
   DROP TABLE IF EXISTS stripe_app_accounts CASCADE;
   DROP TABLE IF EXISTS stripe_operation_policies CASCADE;
   DROP TABLE IF EXISTS stripe_operation_audits CASCADE;
   ```
4. Re-run migration

---

## Post-Migration Checklist

After migrations complete:

### 1. Tables Created

```bash
# Via CLI
supabase migration list  # Should show all migrations as Applied

# Via SQL
SELECT COUNT(*) FROM stripe_app_accounts;
SELECT COUNT(*) FROM stripe_operation_policies;
SELECT COUNT(*) FROM stripe_operation_audits;
```

### 2. Indexes Created

```bash
# Via SQL
SELECT * FROM pg_indexes WHERE tablename LIKE 'stripe%';
```

Expected: 8 indexes total
- `idx_stripe_app_accounts_org_id`
- `idx_stripe_app_accounts_status`
- `idx_stripe_operation_policies_account`
- `idx_stripe_operation_policies_operation`
- `idx_stripe_operation_audits_account`
- `idx_stripe_operation_audits_created`
- `idx_stripe_operation_audits_decision`
- `idx_stripe_operation_audits_account_created`

### 3. RLS Policies Enabled

```bash
# Via SQL
SELECT * FROM pg_policies WHERE tablename LIKE 'stripe%';
```

Expected: 3 policies
- `stripe_app_accounts_org_access`
- `stripe_operation_policies_org_access`
- `stripe_operation_audits_org_access`

### 4. Foreign Keys Configured

```bash
# Via SQL
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
AND table_name LIKE 'stripe%';
```

Expected: 2 foreign keys
- `stripe_operation_policies` → `stripe_app_accounts`
- `stripe_operation_audits` → `stripe_app_accounts`
- `stripe_app_accounts` → `organizations`

### 5. Application Tests Pass

```bash
npm run test:integration  # Tests using Supabase
npm run build             # Verifies TypeScript compatibility
```

---

## Reverting a Migration (Caution)

**Important:** Reverting migrations can cause data loss. Only do this in development/test environments.

### Option 1: Contact Supabase Support

For production, contact support to:
- Backup current data
- Safely roll back to a previous state
- Identify dependent tables/functions

### Option 2: Manual Rollback (Development Only)

```sql
-- Drop tables and indexes in reverse order
DROP POLICY stripe_operation_audits_org_access ON stripe_operation_audits;
DROP POLICY stripe_operation_policies_org_access ON stripe_operation_policies;
DROP POLICY stripe_app_accounts_org_access ON stripe_app_accounts;

DROP INDEX IF EXISTS idx_stripe_operation_audits_account_created;
DROP INDEX IF EXISTS idx_stripe_operation_audits_decision;
DROP INDEX IF EXISTS idx_stripe_operation_audits_created;
DROP INDEX IF EXISTS idx_stripe_operation_audits_account;
DROP INDEX IF EXISTS idx_stripe_operation_policies_operation;
DROP INDEX IF EXISTS idx_stripe_operation_policies_account;
DROP INDEX IF EXISTS idx_stripe_app_accounts_status;
DROP INDEX IF EXISTS idx_stripe_app_accounts_org_id;

DROP TABLE IF EXISTS stripe_operation_audits;
DROP TABLE IF EXISTS stripe_operation_policies;
DROP TABLE IF EXISTS stripe_app_accounts;
```

---

## Next Steps

After migrations are verified:

1. **Regenerate TypeScript types:**
   ```bash
   npm run db:types
   ```

2. **Rebuild application:**
   ```bash
   npm run build
   ```

3. **Deploy to production:**
   ```bash
   vercel --prod
   ```

4. **Monitor logs:**
   - Watch for errors in Vercel deployment logs
   - Check Supabase query logs for slow queries

5. **Test Stripe integration:**
   - Configure Stripe webhook endpoint
   - Send test events
   - Verify records appear in audit tables

---

## Reference: Complete Migration File Locations

All migrations are in: `/supabase/migrations/`

Most recent: `20260606185643_stripe_app_tables.sql`

---

## Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/migrations)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- Repository: [RUNBOOK_DEPLOY.md](./RUNBOOK_DEPLOY.md)
