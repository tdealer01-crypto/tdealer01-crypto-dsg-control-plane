-- Trinity end-to-end workflow: discover -> claim -> in_progress -> submitted -> verified/rejected -> paid

CREATE TABLE IF NOT EXISTS public.trinity_jobs (
  id text PRIMARY KEY,
  org_id text NOT NULL,
  external_id text NOT NULL,
  source_platform text NOT NULL,
  bounty_program text,
  title text NOT NULL,
  category text NOT NULL,
  difficulty text NOT NULL,
  severity text NOT NULL DEFAULT 'unknown',
  exploit_cid text,
  reward_amount numeric NOT NULL CHECK (reward_amount > 0),
  reward_currency text NOT NULL DEFAULT 'SOL',
  reward_usd_estimate numeric NOT NULL DEFAULT 0,
  deadline timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'discovered' CHECK (
    status IN (
      'discovered','claimed','in_progress','submitted','verified','rejected',
      'pending_settlement_review','settlement_failed','paid'
    )
  ),
  source text NOT NULL DEFAULT 'live',
  claimed_by text,
  worker_wallet_address text,
  claimed_at timestamptz,
  submitted_at timestamptz,
  verified_at timestamptz,
  settled_at timestamptz,
  tx_signature text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, external_id, source_platform)
);

CREATE INDEX IF NOT EXISTS idx_trinity_jobs_org_status ON public.trinity_jobs(org_id, status);
CREATE INDEX IF NOT EXISTS idx_trinity_jobs_org_category ON public.trinity_jobs(org_id, category);
CREATE INDEX IF NOT EXISTS idx_trinity_jobs_org_claimed_by ON public.trinity_jobs(org_id, claimed_by);

CREATE TABLE IF NOT EXISTS public.trinity_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  job_id text NOT NULL REFERENCES public.trinity_jobs(id) ON DELETE CASCADE,
  submitted_by text NOT NULL,
  content text NOT NULL,
  content_hash text NOT NULL,
  proof_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  quality_score integer,
  verification_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trinity_deliverables_org_job ON public.trinity_deliverables(org_id, job_id);

CREATE TABLE IF NOT EXISTS public.trinity_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  job_id text NOT NULL REFERENCES public.trinity_jobs(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('paid','pending_manual_review','failed')),
  tx_signature text,
  reason text,
  settled_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, idempotency_key),
  UNIQUE(org_id, job_id, status)
);

CREATE INDEX IF NOT EXISTS idx_trinity_settlements_org_job ON public.trinity_settlements(org_id, job_id);

CREATE TABLE IF NOT EXISTS public.trinity_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  job_id text NOT NULL REFERENCES public.trinity_jobs(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trinity_audit_events_org_job ON public.trinity_audit_events(org_id, job_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trinity_audit_events_hash ON public.trinity_audit_events(event_hash);

CREATE OR REPLACE FUNCTION public.trinity_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_trinity_jobs_updated_at ON public.trinity_jobs;
CREATE TRIGGER trigger_trinity_jobs_updated_at
  BEFORE UPDATE ON public.trinity_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trinity_touch_updated_at();

ALTER TABLE public.trinity_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trinity_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trinity_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trinity_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trinity_jobs_service_role_all ON public.trinity_jobs;
CREATE POLICY trinity_jobs_service_role_all ON public.trinity_jobs
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS trinity_jobs_org_scope ON public.trinity_jobs;
CREATE POLICY trinity_jobs_org_scope ON public.trinity_jobs
  FOR SELECT USING (org_id = coalesce(auth.jwt() ->> 'org_id', ''));

DROP POLICY IF EXISTS trinity_deliverables_service_role_all ON public.trinity_deliverables;
CREATE POLICY trinity_deliverables_service_role_all ON public.trinity_deliverables
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS trinity_deliverables_org_scope ON public.trinity_deliverables;
CREATE POLICY trinity_deliverables_org_scope ON public.trinity_deliverables
  FOR SELECT USING (org_id = coalesce(auth.jwt() ->> 'org_id', ''));

DROP POLICY IF EXISTS trinity_settlements_service_role_all ON public.trinity_settlements;
CREATE POLICY trinity_settlements_service_role_all ON public.trinity_settlements
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS trinity_settlements_org_scope ON public.trinity_settlements;
CREATE POLICY trinity_settlements_org_scope ON public.trinity_settlements
  FOR SELECT USING (org_id = coalesce(auth.jwt() ->> 'org_id', ''));

DROP POLICY IF EXISTS trinity_audit_events_service_role_all ON public.trinity_audit_events;
CREATE POLICY trinity_audit_events_service_role_all ON public.trinity_audit_events
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS trinity_audit_events_org_scope ON public.trinity_audit_events;
CREATE POLICY trinity_audit_events_org_scope ON public.trinity_audit_events
  FOR SELECT USING (org_id = coalesce(auth.jwt() ->> 'org_id', ''));
