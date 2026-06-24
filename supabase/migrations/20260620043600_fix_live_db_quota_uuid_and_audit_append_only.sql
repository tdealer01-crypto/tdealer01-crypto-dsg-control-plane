-- DSG ONE live DB safety fix
-- Date: 2026-06-20
--
-- Fixes two live-test blockers:
-- 1. quota RPC / SQL paths comparing uuid columns with text parameters
-- 2. audit_logs must be append-only at DB level

BEGIN;

-- 1) Audit log immutability guard.
-- This blocks UPDATE/DELETE on audit_logs even if a role accidentally has broad privileges.

CREATE OR REPLACE FUNCTION public.dsg_prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % is not allowed', TG_OP
    USING ERRCODE = '42501';
END;
$$;

DO $$
DECLARE
  target_table regclass;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    to_regclass('public.audit_logs'),
    to_regclass('api.audit_logs')
  ]
  LOOP
    IF target_table IS NOT NULL THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS dsg_audit_logs_append_only_guard ON %s',
        target_table
      );

      EXECUTE format(
        'CREATE TRIGGER dsg_audit_logs_append_only_guard
         BEFORE UPDATE OR DELETE ON %s
         FOR EACH ROW EXECUTE FUNCTION public.dsg_prevent_audit_log_mutation()',
        target_table
      );

      EXECUTE format(
        'REVOKE UPDATE, DELETE, TRUNCATE ON TABLE %s FROM anon, authenticated',
        target_table
      );

      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        EXECUTE format(
          'REVOKE UPDATE, DELETE, TRUNCATE ON TABLE %s FROM service_role',
          target_table
        );
      END IF;

      RAISE NOTICE 'audit_logs append-only guard installed on %', target_table;
    END IF;
  END LOOP;
END $$;

-- 2) Compatibility helper for uuid/text comparisons in quota code.
-- Some older quota RPCs accepted org_id as text and compared directly to uuid columns.
-- This helper safely normalizes text to uuid and fails closed on invalid uuid.

CREATE OR REPLACE FUNCTION public.dsg_text_to_uuid(value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN value::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RAISE EXCEPTION 'invalid uuid: %', value
    USING ERRCODE = '22P02';
END;
$$;

COMMIT;
