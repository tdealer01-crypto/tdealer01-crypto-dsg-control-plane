-- Restore guest_access_grants.expires_at, which the original
-- 20260401120000_enterprise_access_batch2.sql migration created but which
-- was dropped by the later full-schema-sync/reconciliation migrations that
-- recreated the table without it. lib/auth/guest-access.ts and
-- app/dashboard/settings/access/page.tsx read/write this column.

ALTER TABLE public.guest_access_grants
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL;
