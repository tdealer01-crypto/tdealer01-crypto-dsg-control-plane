/**
 * Schema Validation Queries
 *
 * Verify that all delegation-related tables exist with correct schema.
 * Run these queries against live Supabase to validate deployment.
 */

-- Verify safe_dom_manifests table exists and has required columns
SELECT
  'safe_dom_manifests' as table_name,
  COUNT(*) as column_count,
  STRING_AGG(column_name, ', ' ORDER BY column_name) as columns
FROM information_schema.columns
WHERE table_name = 'safe_dom_manifests'
GROUP BY table_name;

-- Verify safe_dom_manifests has correct columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'safe_dom_manifests'
ORDER BY ordinal_position;

-- Verify safe_dom_manifests indexes exist
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'safe_dom_manifests'
ORDER BY indexname;

-- Verify delegated_agi_jobs table exists
SELECT
  'delegated_agi_jobs' as table_name,
  COUNT(*) as column_count,
  STRING_AGG(column_name, ', ' ORDER BY column_name) as columns
FROM information_schema.columns
WHERE table_name = 'delegated_agi_jobs'
GROUP BY table_name;

-- Verify delegated_agi_jobs has correct columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'delegated_agi_jobs'
ORDER BY ordinal_position;

-- Verify delegated_agi_jobs indexes exist
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'delegated_agi_jobs'
ORDER BY indexname;

-- Verify agi_action_audit table exists
SELECT
  'agi_action_audit' as table_name,
  COUNT(*) as column_count,
  STRING_AGG(column_name, ', ' ORDER BY column_name) as columns
FROM information_schema.columns
WHERE table_name = 'agi_action_audit'
GROUP BY table_name;

-- Verify agi_action_audit has correct columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'agi_action_audit'
ORDER BY ordinal_position;

-- Verify agi_action_audit indexes exist
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'agi_action_audit'
ORDER BY indexname;

-- Verify user_confirmation_requests table exists
SELECT
  'user_confirmation_requests' as table_name,
  COUNT(*) as column_count,
  STRING_AGG(column_name, ', ' ORDER BY column_name) as columns
FROM information_schema.columns
WHERE table_name = 'user_confirmation_requests'
GROUP BY table_name;

-- Verify user_confirmation_requests has correct columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_confirmation_requests'
ORDER BY ordinal_position;

-- Verify user_confirmation_requests indexes exist
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_confirmation_requests'
ORDER BY indexname;

-- Verify all required indexes are present
SELECT
  'Index Summary' as check_name,
  COUNT(*) as total_indexes,
  COUNT(*) FILTER (WHERE tablename IN ('safe_dom_manifests', 'delegated_agi_jobs', 'agi_action_audit', 'user_confirmation_requests')) as delegation_indexes
FROM pg_indexes
WHERE schemaname = 'public';

-- Verify RLS is enabled on delegation tables
SELECT
  tablename,
  relrowsecurity
FROM pg_class c
JOIN pg_tables t ON c.relname = t.tablename
WHERE t.tablename IN ('safe_dom_manifests', 'delegated_agi_jobs', 'agi_action_audit', 'user_confirmation_requests')
AND t.schemaname = 'public'
ORDER BY tablename;

-- Verify foreign key constraints exist
SELECT
  constraint_name,
  table_name,
  column_name,
  referenced_table_name,
  referenced_column_name
FROM information_schema.referential_constraints
WHERE table_name IN ('user_confirmation_requests', 'delegated_agi_jobs', 'agi_action_audit')
ORDER BY table_name, constraint_name;

-- Summary: Check that all 4 tables exist
SELECT
  'SCHEMA_VALIDATION_SUMMARY' as check,
  CASE
    WHEN t1 = 1 AND t2 = 1 AND t3 = 1 AND t4 = 1 THEN 'PASS: All tables exist'
    ELSE 'FAIL: Missing tables'
  END as status
FROM (
  SELECT
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'safe_dom_manifests')::int as t1,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'delegated_agi_jobs')::int as t2,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'agi_action_audit')::int as t3,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'user_confirmation_requests')::int as t4
) counts;
