-- Enhance audit_logs table with correlation_id, severity, idempotency_key, actor_email
-- Migration: 20260720_enhance_audit_logs.sql
-- Purpose: Add enterprise audit trail enhancements for SOC 2 compliance + distributed tracing

BEGIN;

-- Add new columns to audit_logs if they don't exist
ALTER TABLE IF EXISTS public.audit_logs
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARN', 'ERROR', 'CRITICAL')),
  ADD COLUMN IF NOT EXISTS correlation_id UUID,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS actor_email TEXT;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation_id ON public.audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_email ON public.audit_logs(actor_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_idempotency_key ON public.audit_logs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_correlation ON public.audit_logs(org_id, correlation_id, created_at DESC);

-- Document schema change
COMMENT ON COLUMN public.audit_logs.severity IS 'Log level: INFO (normal operations), WARN (policy changes), ERROR (failures), CRITICAL (security events)';
COMMENT ON COLUMN public.audit_logs.correlation_id IS 'Distributed trace ID for request tracing across microservices';
COMMENT ON COLUMN public.audit_logs.idempotency_key IS 'Idempotency key for retry-safe operations (prevents double-billing, duplicate records)';
COMMENT ON COLUMN public.audit_logs.actor_email IS 'Email address of the actor (user/service account) performing the action';

COMMIT;
