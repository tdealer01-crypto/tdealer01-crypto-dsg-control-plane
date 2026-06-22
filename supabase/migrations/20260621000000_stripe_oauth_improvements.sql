-- Stripe OAuth Improvements Migration
-- Adds disconnect tracking to stripe_app_accounts (actual table used by the app)

ALTER TABLE stripe_app_accounts 
ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMP;

ALTER TABLE stripe_app_accounts 
ADD COLUMN IF NOT EXISTS webhook_deauthorized BOOLEAN DEFAULT false;

-- Create index for disconnect queries
CREATE INDEX IF NOT EXISTS idx_stripe_app_accounts_disconnected 
ON stripe_app_accounts(status, disconnected_at);

-- Add comments for clarity
COMMENT ON COLUMN stripe_app_accounts.disconnected_at 
IS 'Timestamp when user manually disconnected or webhook deauthorized app';

COMMENT ON COLUMN stripe_app_accounts.webhook_deauthorized 
IS 'True if account.application.deauthorized webhook was received';
