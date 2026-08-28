-- Restored from supabase_migrations.schema_migrations on 2026-08-28.

CREATE TABLE IF NOT EXISTS public.dsg_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_open_id text NOT NULL,
  execution_id text NOT NULL,
  attempt_number integer NOT NULL DEFAULT 0 CHECK (attempt_number >= 0),
  event_type text NOT NULL,
  agent_id text NOT NULL,
  adapter_kind text NOT NULL,
  action_kind text NOT NULL,
  decision text NOT NULL,
  status text NOT NULL,
  policy_version text NOT NULL,
  evidence_hash text,
  previous_hash text,
  current_hash text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_open_id, current_hash)
);

CREATE INDEX IF NOT EXISTS dsg_audit_events_owner_time_idx
  ON public.dsg_audit_events(owner_open_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS dsg_audit_events_execution_idx
  ON public.dsg_audit_events(owner_open_id, execution_id, attempt_number);
ALTER TABLE public.dsg_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY dsg_audit_events_owner_select
  ON public.dsg_audit_events FOR SELECT USING (owner_open_id = auth.uid()::text);
CREATE POLICY dsg_audit_events_owner_insert
  ON public.dsg_audit_events FOR INSERT WITH CHECK (owner_open_id = auth.uid()::text);
