-- Add onboarding_role column to users table
-- Tracks user's selected role for customized onboarding experience
-- Values: 'developer', 'finance_operator', 'executive'

ALTER TABLE users
ADD COLUMN IF NOT EXISTS onboarding_role TEXT
DEFAULT NULL
CHECK (onboarding_role IS NULL OR onboarding_role IN ('developer', 'finance_operator', 'executive'));

-- Create index for efficient role-based queries
CREATE INDEX IF NOT EXISTS idx_users_onboarding_role ON users(onboarding_role);

-- Add comment for documentation
COMMENT ON COLUMN users.onboarding_role IS 'User selected role for customized onboarding: developer, finance_operator, or executive';
