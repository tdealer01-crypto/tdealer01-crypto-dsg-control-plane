-- Create session management table for concurrent session limits + timeout enforcement
-- Migration: 20260720_add_session_limits.sql
-- Purpose: Track user sessions for enterprise session management (timeout, concurrent limit, revocation)

BEGIN;

-- Create user_sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: users can read their own sessions
CREATE POLICY "user_sessions_self_read" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: org admin can read all org sessions
CREATE POLICY "user_sessions_admin_read" ON public.user_sessions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_org_roles
      WHERE org_id = user_sessions.org_id AND role_name = 'admin'
    )
  );

-- RLS Policy: only service role can insert sessions
-- (this prevents users from creating sessions directly)

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_org_id ON public.user_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_org ON public.user_sessions(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked_at ON public.user_sessions(revoked_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON public.user_sessions(user_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON public.user_sessions(token_hash);

-- Document table
COMMENT ON TABLE public.user_sessions IS 'Enterprise session tracking for timeout enforcement, concurrent session limits, and session revocation';
COMMENT ON COLUMN public.user_sessions.token_hash IS 'SHA256 hash of session token (token itself not stored for security)';
COMMENT ON COLUMN public.user_sessions.ip_address IS 'IP address where session was created (for audit trail)';
COMMENT ON COLUMN public.user_sessions.device_fingerprint IS 'Device fingerprint for additional security checks';
COMMENT ON COLUMN public.user_sessions.last_activity_at IS 'Last activity timestamp (for inactivity timeout detection)';
COMMENT ON COLUMN public.user_sessions.expires_at IS 'Session expiration time (absolute timeout)';
COMMENT ON COLUMN public.user_sessions.revoked_at IS 'Revocation timestamp (if session was manually revoked)';
COMMENT ON COLUMN public.user_sessions.revoke_reason IS 'Reason for revocation (password_change, permission_change, admin_revoke, logout)';

-- Create function to get active session count for a user
CREATE OR REPLACE FUNCTION public.user_active_session_count(p_user_id UUID, p_org_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.user_sessions
    WHERE user_id = p_user_id
      AND org_id = p_org_id
      AND revoked_at IS NULL
      AND expires_at > now()
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to revoke all sessions for a user
CREATE OR REPLACE FUNCTION public.revoke_user_sessions(p_user_id UUID, p_reason TEXT DEFAULT 'admin_revoke')
RETURNS INTEGER AS $$
BEGIN
  UPDATE public.user_sessions
  SET revoked_at = now(), revoke_reason = p_reason
  WHERE user_id = p_user_id
    AND revoked_at IS NULL
    AND expires_at > now();

  RETURN FOUND::integer;
END;
$$ LANGUAGE plpgsql;

COMMIT;
