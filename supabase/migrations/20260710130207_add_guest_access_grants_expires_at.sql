ALTER TABLE public.guest_access_grants
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;;
