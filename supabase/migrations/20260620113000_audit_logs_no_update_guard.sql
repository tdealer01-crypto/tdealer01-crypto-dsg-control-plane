-- DSG ONE audit immutability guard
-- Blocks UPDATE on audit_logs at DB trigger level while preserving cleanup behavior via DELETE.

BEGIN;

CREATE OR REPLACE FUNCTION public.dsg_block_audit_log_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs are append-only: updates are blocked'
    USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS dsg_audit_logs_no_update ON public.audit_logs;

CREATE TRIGGER dsg_audit_logs_no_update
BEFORE UPDATE ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.dsg_block_audit_log_update();

REVOKE ALL ON FUNCTION public.dsg_block_audit_log_update() FROM PUBLIC;

COMMIT;
