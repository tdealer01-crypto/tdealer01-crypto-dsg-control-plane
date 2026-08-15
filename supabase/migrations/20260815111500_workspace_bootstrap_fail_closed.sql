-- DSG ONE workspace bootstrap truth boundary.
--
-- This migration is intentionally self-contained. Production/dev database
-- inspection showed that some environments have public.users and
-- public.organizations but do not have the historical
-- dsg_user_workspace_bootstrap table/helper RPC. Bootstrap therefore uses the
-- canonical parent/child tables directly and fails closed on inconsistent
-- identity state.
--
-- Invariants:
--   1. One non-null auth_user_id maps to at most one public.users row.
--   2. Existing inactive identities are never reactivated by bootstrap.
--   3. Existing identity is_active is never mutated by bootstrap.
--   4. users.org_id is written only after its organizations parent exists.
--   5. New workspace + owner profile creation is one database transaction.

BEGIN;

-- Fail with an explicit migration error rather than silently choosing one row
-- if legacy data already violates the identity uniqueness invariant.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id IS NOT NULL
    GROUP BY auth_user_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_AUTH_USER_ID: reconcile public.users before enabling workspace bootstrap';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id_unique_not_null
  ON public.users(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.dsg_ensure_workspace_for_auth_user(
  p_auth_user_id uuid,
  p_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_user_exists boolean := false;
  v_org_id uuid;
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
BEGIN
  IF p_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'auth_user_id is required' USING ERRCODE = '22023';
  END IF;

  -- Serialize all bootstrap attempts for one Supabase Auth identity.
  PERFORM pg_advisory_xact_lock(hashtext(p_auth_user_id::text));

  SELECT id, auth_user_id, email, org_id, is_active
    INTO v_user
  FROM public.users
  WHERE auth_user_id = p_auth_user_id
  LIMIT 1
  FOR UPDATE;

  v_user_exists := FOUND;

  IF v_user_exists AND v_user.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'ACCOUNT_INACTIVE' USING ERRCODE = '42501';
  END IF;

  IF v_user_exists THEN
    v_email := coalesce(nullif(lower(trim(coalesce(v_user.email, ''))), ''), v_email);

    IF v_user.org_id IS NOT NULL THEN
      v_org_id := v_user.org_id;

      -- Never repair an orphan identity by inventing a parent tenant. An
      -- inconsistent existing mapping is a data-integrity incident.
      IF NOT EXISTS (
        SELECT 1
        FROM public.organizations
        WHERE id = v_org_id
      ) THEN
        RAISE EXCEPTION 'WORKSPACE_PARENT_ORG_MISSING' USING ERRCODE = '23503';
      END IF;

      UPDATE public.users
         SET email = coalesce(email, v_email),
             updated_at = now()
       WHERE id = v_user.id;

      RETURN v_org_id;
    END IF;
  END IF;

  -- For a genuinely new/missing workspace, create the canonical parent first.
  INSERT INTO public.organizations (name)
  VALUES (coalesce(v_email, 'DSG Workspace'))
  RETURNING id INTO v_org_id;

  IF v_user_exists THEN
    -- Deliberately do not modify is_active. Reactivation belongs to an explicit
    -- account lifecycle operation, never auth/billing bootstrap.
    UPDATE public.users
       SET org_id = v_org_id,
           email = coalesce(email, v_email),
           role = CASE WHEN role = 'member' THEN 'owner' ELSE role END,
           updated_at = now()
     WHERE id = v_user.id;
  ELSE
    INSERT INTO public.users (
      auth_user_id,
      email,
      org_id,
      role,
      is_active
    ) VALUES (
      p_auth_user_id,
      v_email,
      v_org_id,
      'owner',
      true
    );
  END IF;

  -- Defense in depth: verify the parent still exists before returning success.
  IF NOT EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE id = v_org_id
  ) THEN
    RAISE EXCEPTION 'WORKSPACE_PARENT_ORG_MISSING' USING ERRCODE = '23503';
  END IF;

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.dsg_ensure_workspace_for_auth_user(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dsg_ensure_workspace_for_auth_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dsg_ensure_workspace_for_auth_user(uuid, text) TO service_role;

COMMIT;
