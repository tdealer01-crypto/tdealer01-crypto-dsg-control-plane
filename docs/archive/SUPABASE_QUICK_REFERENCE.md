# Supabase Quick Reference Card

One-page reference for common Supabase tasks. Full guides in related documents.

---

## Prerequisites

```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Verify installation
supabase --version

# Authenticate
supabase login
```

---

## Common Tasks

### 1. Link a Project

```bash
supabase link --project-ref <PROJECT_REF>
# Enter database password when prompted
```

**Project reference location:** Supabase Dashboard → Settings → General

---

### 2. Check Migration Status

```bash
supabase migration list
```

Output:
- **Applied** — Already in database
- **Pending** — Local file, not yet applied

---

### 3. Apply Pending Migrations

```bash
supabase db push
```

Applies all pending migrations in correct order.

---

### 4. Generate TypeScript Types

```bash
npm run db:types
# Or manually:
SUPABASE_PROJECT_ID=<ID> npm run db:types
```

Regenerates `lib/database.types.ts` after schema changes.

---

## Connection Information

### Get Connection String

**Dashboard:** Settings → Database → Connection String

**Types:**
- **User Session** — Client-side (anon key)
- **Service Role** — Server-side (service role key)

### Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://[id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[key]
SUPABASE_SERVICE_ROLE_KEY=[key]
```

### Set in Vercel

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

---

## Stripe Governance Tables (Latest Migration)

**File:** `20260606185643_stripe_app_tables.sql`

### Tables Created

| Table | Rows | Purpose |
|-------|------|---------|
| `stripe_app_accounts` | 0 | Stripe account registration |
| `stripe_operation_policies` | 0 | Governance rules |
| `stripe_operation_audits` | 0 | Audit trail |

### Verify Tables

```sql
SELECT COUNT(*) FROM stripe_app_accounts;
SELECT COUNT(*) FROM stripe_operation_policies;
SELECT COUNT(*) FROM stripe_operation_audits;
```

### Indexes Created (8 total)

```sql
SELECT * FROM pg_indexes WHERE tablename LIKE 'stripe%';
```

### RLS Policies (3 total)

```sql
SELECT * FROM pg_policies WHERE tablename LIKE 'stripe%';
```

All policies enforce organization-based access control.

---

## Quick Verification

### In Supabase Dashboard

1. **SQL Editor** → New Query
2. Paste verification queries:

```sql
-- Table existence
SELECT tablename FROM information_schema.tables
WHERE table_schema = 'public'
AND tablename LIKE 'stripe%';

-- RLS status
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename LIKE 'stripe%';

-- Row counts
SELECT 'stripe_app_accounts' AS table, COUNT(*) FROM stripe_app_accounts
UNION ALL
SELECT 'stripe_operation_policies', COUNT(*) FROM stripe_operation_policies
UNION ALL
SELECT 'stripe_operation_audits', COUNT(*) FROM stripe_operation_audits;
```

---

## Troubleshooting

### Not Logged In

```bash
supabase login
```

### Project Not Linked

```bash
supabase link --project-ref <PROJECT_REF>
```

### Migration Failed

```bash
# Check status
supabase migration list

# Review error
supabase db push --dry-run

# Details in docs/SUPABASE_MIGRATION_GUIDE.md
```

### Connection Timeout

1. Verify internet connection
2. Check project is not paused (Supabase Dashboard)
3. Try again

### "Table Already Exists"

Migration was already applied. Safe to skip.

---

## Common Commands

| Task | Command |
|------|---------|
| List projects | `supabase projects list` |
| Link project | `supabase link --project-ref <REF>` |
| Check status | `supabase migration list` |
| Apply migrations | `supabase db push` |
| Start local DB | `supabase start` |
| Stop local DB | `supabase stop` |
| View functions | `supabase functions list` |
| Deploy function | `supabase functions deploy <NAME>` |
| View logs | `supabase functions logs <NAME>` |

---

## Access Control (RLS)

### Organization-Based

All Stripe tables enforce RLS:
```sql
-- User can only access their org's Stripe accounts
dsg_org_id IN (
  SELECT org_id FROM org_members WHERE user_id = auth.uid()
)
```

### Test as Anonymous

```sql
SET ROLE anon;
SELECT * FROM stripe_app_accounts;
-- Result: 0 rows (no access)
RESET ROLE;
```

### Test as Authenticated

```sql
SET auth.uid = '<user-uuid>';
SET ROLE authenticated;
SELECT * FROM stripe_app_accounts;
-- Result: accounts accessible to user's orgs
RESET ROLE;
```

---

## Schema Changes

### After Any Migration

1. Apply migration: `supabase db push`
2. Regenerate types: `npm run db:types`
3. Rebuild app: `npm run build`
4. Run tests: `npm test`

---

## Documentation

| Document | Purpose |
|----------|---------|
| `docs/DEPLOYMENT_SUPABASE_SETUP.md` | Complete setup guide |
| `docs/SUPABASE_MIGRATION_GUIDE.md` | Migration execution (3 methods) |
| `docs/SUPABASE_SETUP_INDEX.md` | Navigation and index |
| `scripts/verify-supabase-schema.sql` | Schema verification queries |
| `scripts/setup-supabase-local.sh` | Automated local setup |

---

## Next Steps

1. **Link project:** `supabase link --project-ref <REF>`
2. **Check status:** `supabase migration list`
3. **Apply migrations:** `supabase db push`
4. **Verify:** Run queries in `verify-supabase-schema.sql`
5. **Generate types:** `npm run db:types`
6. **Deploy:** `vercel --prod`

---

## Useful Links

- Supabase: https://supabase.com
- Dashboard: https://supabase.com/dashboard
- CLI Docs: https://supabase.com/docs/guides/cli
- Migrations: https://supabase.com/docs/guides/migrations

---

## Emergency Contacts

For issues:
1. Check troubleshooting section above
2. Review full documentation
3. Contact Supabase support: https://supabase.com/support
4. Check GitHub Issues: https://github.com/supabase/supabase

---

**Last Updated:** 2026-06-07
**Migration Version:** 20260606185643_stripe_app_tables.sql
**Total Migrations:** 56
