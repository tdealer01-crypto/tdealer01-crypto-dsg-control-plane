-- Harden paid-flow workspace bootstrap against implicit account reactivation
-- and orphan tenant state.
--
-- Invariants:
--   1. Existing inactive identities are never reactivated by bootstrap.
--   2. Existing identity is_active is never mutated by bootstrap.
--   3. A canonical organizations row must exist before users.org_id is written.
--   4. Any parent-org creation failure aborts the transaction instead of
--      allowing a partial workspace mapping to survive.

BEGIN;

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
  v_email text := nullif(trim(coalesce(p_email, '')), '');
BEGIN
  IF p_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'auth_user_id is required' USING ERRCODE = '22023';
  END IF;

  -- Serialize bootstrap attempts for the same authenticated identity.
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
    v_email := coalesce(nullif(trim(coalesce(v_user.email, '')), ''), v_email);
  END IF;

  IF v_user_exists AND v_user.org_id IS NOT NULL THEN
    v_org_id := v_user.org_id::text::uuid;
  ELSE
    SELECT org_id
      INTO v_org_id
    FROM public.dsg_user_workspace_bootstrap
    WHERE auth_user_id = p_auth_user_id;

    IF v_org_id IS NULL THEN
      v_org_id := gen_random_uuid();
      INSERT INTO public.dsg_user_workspace_bootstrap (auth_user_id, org_id, email)
      VALUES (p_auth_user_id, v_org_id, v_email)
      ON CONFLICT (auth_user_id) DO UPDATE
        SET email = coalesce(public.dsg_user_workspace_bootstrap.email, EXCLUDED.email),
            updated_at = now()
      RETURNING org_id INTO v_org_id;
    END IF;
  END IF;

  -- organizations is the canonical tenant parent used by the application.
  -- The legacy helper remains schema-tolerant, but its best-effort behavior is
  -- no longer accepted as success: the row is verified immediately afterward.
  PERFORM public.dsg_try_insert_workspace_org(
    to_regclass('public.organizations'),
    v_org_id,
    coalesce(v_email, 'DSG Workspace')
  );

  IF to_regclass('public.organizations') IS NULL THEN
    RAISE EXCEPTION 'WORKSPACE_PARENT_TABLE_MISSING' USING ERRCODE = '55000';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE id::text = v_org_id::text
  ) THEN
    RAISE EXCEPTION 'WORKSPACE_PARENT_ORG_MISSING' USING ERRCODE = '23503';
  END IF;

  UPDATE public.dsg_user_workspace_bootstrap
     SET org_id = v_org_id,
         email = coalesce(email, v_email),
         updated_at = now()
   WHERE auth_user_id = p_auth_user_id;

  IF v_user_exists THEN
    -- Deliberately do not modify is_active. Reactivation belongs to an explicit
    -- account lifecycle operation, never billing/auth bootstrap.
    UPDATE public.users
       SET org_id = v_org_id,
           email = coalesce(email, v_email)
     WHERE id = v_user.id;
  ELSE
    INSERT INTO public.users (auth_user_id, email, org_id, is_active)
    VALUES (p_auth_user_id, v_email, v_org_id, true);
  END IF;

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.dsg_ensure_workspace_for_auth_user(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dsg_ensure_workspace_for_auth_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dsg_ensure_workspace_for_auth_user(uuid, text) TO service_role;

COMMIT;
