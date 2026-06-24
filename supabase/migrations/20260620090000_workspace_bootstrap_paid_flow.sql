-- DSG ONE paid-flow workspace bootstrap
-- Creates a race-safe auth_user_id -> org_id mapping and a server-side RPC.
-- The application must call this RPC only after verifying the Supabase Auth session server-side.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.dsg_user_workspace_bootstrap (
  auth_user_id uuid PRIMARY KEY,
  org_id uuid UNIQUE NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.dsg_try_insert_workspace_org(
  p_table regclass,
  p_org_id uuid,
  p_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cols text[] := ARRAY['id'];
  vals text[] := ARRAY['$1'];
BEGIN
  IF p_table IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = split_part(p_table::text, '.', 1)
      AND table_name = split_part(p_table::text, '.', 2)
      AND column_name = 'id'
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = split_part(p_table::text, '.', 1)
      AND table_name = split_part(p_table::text, '.', 2)
      AND column_name = 'name'
  ) THEN
    cols := cols || 'name';
    vals := vals || '$2';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = split_part(p_table::text, '.', 1)
      AND table_name = split_part(p_table::text, '.', 2)
      AND column_name = 'plan'
  ) THEN
    cols := cols || 'plan';
    vals := vals || '$3';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = split_part(p_table::text, '.', 1)
      AND table_name = split_part(p_table::text, '.', 2)
      AND column_name = 'created_at'
  ) THEN
    cols := cols || 'created_at';
    vals := vals || '$4';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = split_part(p_table::text, '.', 1)
      AND table_name = split_part(p_table::text, '.', 2)
      AND column_name = 'updated_at'
  ) THEN
    cols := cols || 'updated_at';
    vals := vals || '$5';
  END IF;

  EXECUTE format(
    'INSERT INTO %s (%s) VALUES (%s) ON CONFLICT (id) DO NOTHING',
    p_table,
    array_to_string(cols, ', '),
    array_to_string(vals, ', ')
  ) USING p_org_id, p_name, 'trial', now(), now();
EXCEPTION WHEN others THEN
  RAISE NOTICE 'workspace org insert skipped for %: %', p_table, SQLERRM;
END;
$$;

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
  v_org_id uuid;
  v_email text := nullif(trim(coalesce(p_email, '')), '');
BEGIN
  IF p_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'auth_user_id is required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_auth_user_id::text));

  SELECT id, auth_user_id, email, org_id, is_active
    INTO v_user
  FROM public.users
  WHERE auth_user_id = p_auth_user_id
  LIMIT 1;

  v_email := coalesce(nullif(trim(coalesce(v_user.email, '')), ''), v_email);

  IF v_user.org_id IS NOT NULL THEN
    v_org_id := v_user.org_id;
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
        SET updated_at = now()
      RETURNING org_id INTO v_org_id;
    END IF;
  END IF;

  PERFORM public.dsg_try_insert_workspace_org(
    to_regclass('public.organizations'),
    v_org_id,
    coalesce(v_email, 'DSG Workspace')
  );

  PERFORM public.dsg_try_insert_workspace_org(
    to_regclass('public.orgs'),
    v_org_id,
    coalesce(v_email, 'DSG Workspace')
  );

  UPDATE public.dsg_user_workspace_bootstrap
     SET org_id = v_org_id,
         email = coalesce(email, v_email),
         updated_at = now()
   WHERE auth_user_id = p_auth_user_id;

  UPDATE public.users
     SET org_id = v_org_id,
         is_active = true,
         email = coalesce(email, v_email)
   WHERE auth_user_id = p_auth_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.users (auth_user_id, email, org_id, is_active)
    VALUES (p_auth_user_id, v_email, v_org_id, true);
  END IF;

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.dsg_try_insert_workspace_org(regclass, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dsg_ensure_workspace_for_auth_user(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dsg_ensure_workspace_for_auth_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dsg_ensure_workspace_for_auth_user(uuid, text) TO service_role;

COMMIT;
