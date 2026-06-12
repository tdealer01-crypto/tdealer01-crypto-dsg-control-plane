-- Persist observable Stripe App disconnect/deauthorization evidence.
ALTER TABLE stripe_app_accounts
  ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disconnect_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_lifecycle_event_id TEXT;

CREATE INDEX IF NOT EXISTS idx_stripe_app_accounts_lifecycle_event
  ON stripe_app_accounts(last_lifecycle_event_id)
  WHERE last_lifecycle_event_id IS NOT NULL;
