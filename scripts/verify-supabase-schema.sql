-- Supabase Schema Verification Queries
-- Run these queries to verify migration 20260606185643_stripe_app_tables.sql completed successfully
-- Execute in Supabase SQL Editor or psql

-- ============================================================================
-- Section 1: Table Existence Checks
-- ============================================================================

-- Check if stripe_app_accounts table exists
SELECT
  EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'stripe_app_accounts'
  ) AS stripe_app_accounts_exists;

-- Check if stripe_operation_policies table exists
SELECT
  EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'stripe_operation_policies'
  ) AS stripe_operation_policies_exists;

-- Check if stripe_operation_audits table exists
SELECT
  EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'stripe_operation_audits'
  ) AS stripe_operation_audits_exists;

-- ============================================================================
-- Section 2: Index Verification
-- ============================================================================

-- Show all indexes for Stripe tables
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN (
  'stripe_app_accounts',
  'stripe_operation_policies',
  'stripe_operation_audits'
)
ORDER BY tablename, indexname;

-- Verify specific critical indexes exist
SELECT
  indexname,
  tablename,
  CASE
    WHEN indexname = 'idx_stripe_app_accounts_org_id' THEN 'stripe_app_accounts lookup'
    WHEN indexname = 'idx_stripe_app_accounts_status' THEN 'account status filtering'
    WHEN indexname = 'idx_stripe_operation_policies_account' THEN 'policies lookup'
    WHEN indexname = 'idx_stripe_operation_policies_operation' THEN 'operation type filtering'
    WHEN indexname = 'idx_stripe_operation_audits_account' THEN 'audits account lookup'
    WHEN indexname = 'idx_stripe_operation_audits_created' THEN 'audits time-range queries'
    WHEN indexname = 'idx_stripe_operation_audits_decision' THEN 'audits decision filtering'
    WHEN indexname = 'idx_stripe_operation_audits_account_created' THEN 'audits quota counting'
    ELSE 'unknown'
  END AS purpose,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_indexes
WHERE tablename IN (
  'stripe_app_accounts',
  'stripe_operation_policies',
  'stripe_operation_audits'
)
ORDER BY tablename, indexname;

-- ============================================================================
-- Section 3: RLS Policy Verification
-- ============================================================================

-- Check if RLS is enabled on all three tables
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename IN (
  'stripe_app_accounts',
  'stripe_operation_policies',
  'stripe_operation_audits'
)
ORDER BY tablename;

-- Show all RLS policies on Stripe tables
SELECT
  tablename,
  policyname,
  permissive,
  qual AS policy_definition
FROM pg_policies
WHERE tablename IN (
  'stripe_app_accounts',
  'stripe_operation_policies',
  'stripe_operation_audits'
)
ORDER BY tablename, policyname;

-- Verify specific RLS policies exist
SELECT
  COUNT(*) AS total_policies,
  COUNT(CASE WHEN tablename = 'stripe_app_accounts' THEN 1 END) AS accounts_policies,
  COUNT(CASE WHEN tablename = 'stripe_operation_policies' THEN 1 END) AS policies_policies,
  COUNT(CASE WHEN tablename = 'stripe_operation_audits' THEN 1 END) AS audits_policies
FROM pg_policies
WHERE tablename IN (
  'stripe_app_accounts',
  'stripe_operation_policies',
  'stripe_operation_audits'
);

-- ============================================================================
-- Section 4: Row Counts
-- ============================================================================

-- Get current row counts for all three tables
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
FROM stripe_operation_audits

ORDER BY table_name;

-- Detailed row counts with additional stats
SELECT
  tablename,
  COUNT(*) as live_rows,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
FROM (
  SELECT 'stripe_app_accounts' as tablename, 'public' as schemaname
  UNION ALL
  SELECT 'stripe_operation_policies', 'public'
  UNION ALL
  SELECT 'stripe_operation_audits', 'public'
) AS tables
JOIN (
  SELECT COUNT(*) FROM stripe_app_accounts
  UNION ALL
  SELECT COUNT(*) FROM stripe_operation_policies
  UNION ALL
  SELECT COUNT(*) FROM stripe_operation_audits
) AS counts ON true
GROUP BY tablename, schemaname;

-- ============================================================================
-- Section 5: Full Table Schema
-- ============================================================================

-- Show all columns for stripe_app_accounts
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'stripe_app_accounts'
ORDER BY ordinal_position;

-- Show all columns for stripe_operation_policies
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'stripe_operation_policies'
ORDER BY ordinal_position;

-- Show all columns for stripe_operation_audits
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'stripe_operation_audits'
ORDER BY ordinal_position;

-- Combined schema view
SELECT
  table_name,
  string_agg(
    column_name || ' (' || data_type || ')' ||
    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
    ', ' ORDER BY ordinal_position
  ) AS schema_definition
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'stripe_app_accounts',
    'stripe_operation_policies',
    'stripe_operation_audits'
  )
GROUP BY table_name
ORDER BY table_name;

-- ============================================================================
-- Section 6: Constraints and Foreign Keys
-- ============================================================================

-- Show all table constraints
SELECT
  constraint_name,
  table_name,
  constraint_type,
  is_deferrable,
  initially_deferred
FROM information_schema.table_constraints
WHERE table_name IN (
  'stripe_app_accounts',
  'stripe_operation_policies',
  'stripe_operation_audits'
)
ORDER BY table_name, constraint_type, constraint_name;

-- Show foreign key relationships
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'stripe_app_accounts',
    'stripe_operation_policies',
    'stripe_operation_audits'
  )
ORDER BY tc.table_name, tc.constraint_name;

-- Show unique constraints
SELECT
  constraint_name,
  table_name,
  column_name
FROM information_schema.key_column_usage
WHERE constraint_type = 'UNIQUE'
  AND table_name IN (
    'stripe_app_accounts',
    'stripe_operation_policies',
    'stripe_operation_audits'
  )
ORDER BY table_name, constraint_name;

-- ============================================================================
-- Section 7: Default Values and Sequences
-- ============================================================================

-- Show all default values
SELECT
  table_name,
  column_name,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'stripe_app_accounts',
    'stripe_operation_policies',
    'stripe_operation_audits'
  )
  AND column_default IS NOT NULL
ORDER BY table_name, ordinal_position;

-- Check for UUID generation
SELECT
  table_name,
  column_name,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'stripe_app_accounts',
    'stripe_operation_policies',
    'stripe_operation_audits'
  )
  AND (column_default LIKE '%uuid%' OR column_default LIKE '%gen_random%')
ORDER BY table_name;

-- ============================================================================
-- Section 8: Performance and Space Analysis
-- ============================================================================

-- Table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size('public.'||tablename)) AS table_size,
  pg_size_pretty(pg_indexes_size('public.'||tablename)) AS indexes_size
FROM pg_tables
WHERE tablename IN (
  'stripe_app_accounts',
  'stripe_operation_policies',
  'stripe_operation_audits'
)
ORDER BY pg_total_relation_size('public.'||tablename) DESC;

-- Index sizes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_indexes
WHERE tablename IN (
  'stripe_app_accounts',
  'stripe_operation_policies',
  'stripe_operation_audits'
)
ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================================================
-- Section 9: Migration Verification Summary
-- ============================================================================

-- Create a summary report
SELECT
  'stripe_app_accounts' AS table_name,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'stripe_app_accounts') AS table_exists,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'stripe_app_accounts') AS index_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'stripe_app_accounts') AS policy_count,
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'stripe_app_accounts') AS rls_enabled,
  (SELECT COUNT(*) FROM stripe_app_accounts) AS row_count

UNION ALL

SELECT
  'stripe_operation_policies' AS table_name,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'stripe_operation_policies') AS table_exists,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'stripe_operation_policies') AS index_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'stripe_operation_policies') AS policy_count,
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'stripe_operation_policies') AS rls_enabled,
  (SELECT COUNT(*) FROM stripe_operation_policies) AS row_count

UNION ALL

SELECT
  'stripe_operation_audits' AS table_name,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'stripe_operation_audits') AS table_exists,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'stripe_operation_audits') AS index_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'stripe_operation_audits') AS policy_count,
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'stripe_operation_audits') AS rls_enabled,
  (SELECT COUNT(*) FROM stripe_operation_audits) AS row_count;

-- ============================================================================
-- Section 10: Example Data Queries
-- ============================================================================

-- Sample data from stripe_app_accounts (if any exist)
SELECT
  id,
  stripe_account_id,
  dsg_org_id,
  status,
  fail_safe_mode,
  installed_at
FROM stripe_app_accounts
LIMIT 5;

-- Sample data from stripe_operation_policies (if any exist)
SELECT
  id,
  stripe_account_id,
  operation_type,
  action,
  enabled,
  created_at
FROM stripe_operation_policies
LIMIT 5;

-- Sample data from stripe_operation_audits (if any exist)
SELECT
  id,
  stripe_account_id,
  stripe_event_id,
  operation_type,
  dsg_decision,
  status,
  created_at
FROM stripe_operation_audits
LIMIT 5;
