-- Test migration for integration verification
-- This migration verifies the automated workflow is functioning

CREATE TABLE IF NOT EXISTS integration_test (
  id BIGSERIAL PRIMARY KEY,
  test_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE integration_test IS 'Test table for integration automation verification';
