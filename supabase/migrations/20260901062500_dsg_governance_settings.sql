CREATE TABLE IF NOT EXISTS public.dsg_governance_settings (
  org_id TEXT PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'observe' CHECK (mode IN ('observe', 'enforce')),
  updated_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dsg_governance_settings ENABLE ROW LEVEL SECURITY;

-- Runtime reads/writes are server-side only. No anon/authenticated policies are
-- created because the API resolves org membership and role before using the
-- backend service credential.