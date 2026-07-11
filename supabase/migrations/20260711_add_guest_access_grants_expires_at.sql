-- Add expires_at column to guest_access_grants table
-- Enables time-limited guest access with automatic expiration tracking

-- Add expires_at column (nullable - guest access without expiration is valid)
alter table public.guest_access_grants
add column if not exists expires_at timestamptz null;

-- Add index for efficient querying of active/expired access
-- Common query: find all active guest access that hasn't expired
-- SELECT * FROM guest_access_grants WHERE org_id = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > now())
create index if not exists idx_guest_access_grants_expires_at
on public.guest_access_grants(org_id, status, expires_at);

-- Add comment documenting the column purpose
comment on column public.guest_access_grants.expires_at is 'Timestamp when guest access expires. NULL means no expiration. Used for automatic revocation of temporary guest access.';

-- Idempotent: this migration can be run multiple times safely
-- All statements use "if not exists" or "add column if not exists"
-- Testing workflow with npm-installed supabase CLI (2026-07-11 12:59Z)
