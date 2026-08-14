create table if not exists marketing_agent_runs (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now(),
  summary text not null default '',
  actions_taken text[] not null default '{}',
  status text not null default 'ok' check (status in ('ok', 'error')),
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_marketing_agent_runs_run_at
  on marketing_agent_runs(run_at desc);

alter table marketing_agent_runs enable row level security;
