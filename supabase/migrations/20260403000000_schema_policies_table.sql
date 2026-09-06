-- Add policies table to match schema.sql
-- The product_loop_scaffold migration already creates this table,
-- but this ensures it exists if migrations are run in isolation.

create table if not exists public.policies (
  id text primary key,
  name text not null,
  version text not null default 'v1',
  status text not null default 'active',
  description text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure agents.policy_id has a proper FK if not already set
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'agents_policy_id_fkey'
      and table_name = 'agents'
  ) then
    begin
      alter table public.agents
        add constraint agents_policy_id_fkey
        foreign key (policy_id) references public.policies(id) on update cascade;
    exception when others then
      raise notice 'Could not add agents_policy_id_fkey: %', sqlerrm;
    end;
  end if;
end $$;

-- A legacy preview database can already contain public.policies with a UUID
-- primary key. CREATE TABLE IF NOT EXISTS preserves that old column type, so
-- inserting the canonical text id `policy_default` would fail before the later
-- full-schema sync recreates public.policies with id text. Seed only when the
-- existing id column is text-compatible. The canonical full-schema migration
-- performs the baseline seed after rebuilding the table.
do $$
declare
  v_id_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
    into v_id_type
  from pg_attribute a
  where a.attrelid = 'public.policies'::regclass
    and a.attname = 'id'
    and a.attnum > 0
    and not a.attisdropped;

  if v_id_type in ('text', 'character varying') then
    insert into public.policies (id, name, version, status, description, config)
    values (
      'policy_default',
      'Default DSG Policy',
      'v1',
      'active',
      'Baseline deterministic policy for scaffold execution routes.',
      jsonb_build_object('block_risk_score', 0.8, 'stabilize_risk_score', 0.4)
    )
    on conflict (id) do nothing;
  else
    raise notice 'Skipping policy_default seed because public.policies.id type is %, expected text-compatible legacy shape', v_id_type;
  end if;
end $$;
