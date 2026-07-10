/**
 * Add expires_at column to guest_access_grants table
 * Required for access grant expiration management
 */

ALTER TABLE public.guest_access_grants
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_guest_access_grants_expires_at
  ON public.guest_access_grants(expires_at)
  WHERE expires_at IS NOT NULL;
