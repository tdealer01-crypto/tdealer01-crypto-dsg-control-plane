create table if not exists public.dsg_simulation_input_history (
  id bigserial primary key,
  batch_id text not null,
  run_id text not null,
  run_attempt text not null,
  observation_id text not null,
  query text not null,
  source_url text not null,
  publisher text not null,
  published_at timestamptz,
  fetched_at timestamptz not null,
  status text not null check (status in ('LOADED','FAILED')),
  status_code integer not null,
  rank integer not null check (rank > 0),
  score double precision not null,
  source_sha256 text not null,
  pdf_sha256 text not null,
  pdf_file text not null,
  excerpt text not null,
  error text,
  created_at timestamptz not null default now(),
  constraint dsg_simulation_input_history_unique_source unique (batch_id, source_url),
  constraint dsg_simulation_input_history_source_hash_shape check (source_sha256 = '' or source_sha256 ~ '^[0-9a-f]{64}$'),
  constraint dsg_simulation_input_history_pdf_hash_shape check (pdf_sha256 ~ '^[0-9a-f]{64}$')
);

create index if not exists dsg_simulation_input_history_observation_idx
  on public.dsg_simulation_input_history (observation_id, created_at desc);
create index if not exists dsg_simulation_input_history_run_idx
  on public.dsg_simulation_input_history (run_id, run_attempt, created_at desc);
create index if not exists dsg_simulation_input_history_batch_idx
  on public.dsg_simulation_input_history (batch_id, rank);

comment on table public.dsg_simulation_input_history is
  'Append-only provenance for research and live inputs prepared before deterministic DSG simulation. PDF evidence is stored in private bucket dsg-simulation-input-evidence.';

alter table public.dsg_simulation_input_history enable row level security;

revoke all on table public.dsg_simulation_input_history from anon, authenticated;
revoke all on sequence public.dsg_simulation_input_history_id_seq from anon, authenticated;

grant select, insert on table public.dsg_simulation_input_history to service_role;
grant usage, select on sequence public.dsg_simulation_input_history_id_seq to service_role;

create or replace function public.block_dsg_simulation_input_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'DSG_SIMULATION_INPUT_HISTORY_APPEND_ONLY';
end;
$$;

revoke all on function public.block_dsg_simulation_input_history_mutation() from public;
revoke all on function public.block_dsg_simulation_input_history_mutation() from anon, authenticated;
grant execute on function public.block_dsg_simulation_input_history_mutation() to service_role;

drop trigger if exists dsg_simulation_input_history_append_only on public.dsg_simulation_input_history;
create trigger dsg_simulation_input_history_append_only
before update or delete on public.dsg_simulation_input_history
for each row execute function public.block_dsg_simulation_input_history_mutation();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dsg-simulation-input-evidence',
  'dsg-simulation-input-evidence',
  false,
  10485760,
  array['application/pdf','application/json','application/x-ndjson']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
