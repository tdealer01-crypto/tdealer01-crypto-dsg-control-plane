-- Server-backed UI page memory for DSG dashboard surfaces.
-- Stores user-visible page state so refresh/navigation does not erase operator context.
-- Source-of-truth is org-scoped Supabase, not localStorage.

CREATE TABLE IF NOT EXISTS public.dsg_ui_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  user_id uuid NULL,
  page_key text NOT NULL,
  memory_key text NOT NULL DEFAULT 'default',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dsg_ui_memory_page_key_not_blank CHECK (length(trim(page_key)) > 0),
  CONSTRAINT dsg_ui_memory_memory_key_not_blank CHECK (length(trim(memory_key)) > 0),
  CONSTRAINT dsg_ui_memory_payload_is_object CHECK (jsonb_typeof(payload) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS dsg_ui_memory_org_user_page_key_idx
  ON public.dsg_ui_memory (org_id, coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), page_key, memory_key);

CREATE INDEX IF NOT EXISTS dsg_ui_memory_org_updated_idx
  ON public.dsg_ui_memory (org_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.set_dsg_ui_memory_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsg_ui_memory_updated_at ON public.dsg_ui_memory;
CREATE TRIGGER trg_dsg_ui_memory_updated_at
BEFORE UPDATE ON public.dsg_ui_memory
FOR EACH ROW
EXECUTE FUNCTION public.set_dsg_ui_memory_updated_at();

ALTER TABLE public.dsg_ui_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dsg_ui_memory_org_isolation ON public.dsg_ui_memory;
CREATE POLICY dsg_ui_memory_org_isolation
ON public.dsg_ui_memory
USING (org_id::text = current_setting('app.org_id', true))
WITH CHECK (org_id::text = current_setting('app.org_id', true));
