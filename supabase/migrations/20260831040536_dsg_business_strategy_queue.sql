create table if not exists public.dsg_business_strategy_projects (
  project_id text primary key,
  project_name text not null,
  is_agentic boolean not null,
  is_open_ecosystem boolean not null,
  relies_on_benchmarks_only boolean not null default false,
  has_human_oversight boolean not null,
  has_watermark_system boolean not null default false,
  is_high_impact boolean not null default false,
  evaluation_status text not null default 'PENDING' check (evaluation_status in ('PENDING','APPROVED','NEEDS_REVISION','REJECTED','BLOCKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dsg_business_strategy_evaluations (
  id bigserial primary key,
  project_id text not null references public.dsg_business_strategy_projects(project_id),
  decision text not null check (decision in ('APPROVED','NEEDS_REVISION','REJECTED','BLOCKED')),
  final_score integer not null,
  rule_version text not null,
  input_sha256 text not null check (input_sha256 ~ '^[0-9a-f]{64}$'),
  decision_sha256 text not null check (decision_sha256 ~ '^[0-9a-f]{64}$'),
  remark text not null,
  created_at timestamptz not null default now(),
  unique(project_id, decision_sha256)
);

alter table public.dsg_business_strategy_projects enable row level security;
alter table public.dsg_business_strategy_evaluations enable row level security;
revoke all on public.dsg_business_strategy_projects from anon, authenticated;
revoke all on public.dsg_business_strategy_evaluations from anon, authenticated;
grant select, update on public.dsg_business_strategy_projects to service_role;
grant select, insert on public.dsg_business_strategy_evaluations to service_role;
grant usage, select on sequence public.dsg_business_strategy_evaluations_id_seq to service_role;

create or replace function public.block_dsg_business_strategy_evaluation_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'DSG_BUSINESS_STRATEGY_EVALUATIONS_APPEND_ONLY';
end;
$$;
revoke all on function public.block_dsg_business_strategy_evaluation_mutation() from public, anon, authenticated;
grant execute on function public.block_dsg_business_strategy_evaluation_mutation() to service_role;

drop trigger if exists dsg_business_strategy_evaluations_append_only on public.dsg_business_strategy_evaluations;
create trigger dsg_business_strategy_evaluations_append_only
before update or delete on public.dsg_business_strategy_evaluations
for each row execute function public.block_dsg_business_strategy_evaluation_mutation();

create index if not exists dsg_business_strategy_projects_status_idx on public.dsg_business_strategy_projects(evaluation_status, created_at);
create index if not exists dsg_business_strategy_evaluations_project_idx on public.dsg_business_strategy_evaluations(project_id, created_at desc);
