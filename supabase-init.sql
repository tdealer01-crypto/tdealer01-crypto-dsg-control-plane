create table if not exists enterprise_leads (
  id bigint generated always as identity primary key,
  name text,
  email text,
  company text,
  use_case text,
  created_at timestamptz default now()
);

create table if not exists execution_audit (
  id bigint generated always as identity primary key,
  agent text,
  action_type text,
  prev_state jsonb,
  next_state jsonb,
  decision text,
  reason text,
  phase text,
  drift double precision,
  stability double precision,
  harmonic_center double precision,
  entropy double precision,
  timestamp timestamptz default now(),
  hash_prev text,
  hash text
);
