drop function if exists public.runtime_commit_execution(
  text, text, uuid, text, text, jsonb, text, jsonb, integer, jsonb, jsonb, text, jsonb, numeric, timestamptz, integer, integer
);

notify pgrst, 'reload schema';;
