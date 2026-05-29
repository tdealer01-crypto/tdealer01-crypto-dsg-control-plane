-- Delivery Proof: persisted compliance status reports (replaces in-memory cache)
-- run_id is the shareable slug (CI-generated or user-generated UUID)
create table if not exists delivery_proof_reports (
  id            uuid primary key default gen_random_uuid(),
  run_id        text not null unique,
  claim_pass_eligible boolean not null,
  mutation_score      numeric,
  requirements_pass   int,
  requirements_total  int,
  matrix_json         jsonb,
  last_ci_run         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- index for fast slug lookup
create index if not exists idx_delivery_proof_run_id on delivery_proof_reports (run_id);

-- row-level security: public read (anyone with run_id can view), no anon write
alter table delivery_proof_reports enable row level security;

create policy "public_read" on delivery_proof_reports
  for select using (true);

-- only service role can insert/update (CI uploads via service key)
create policy "service_write" on delivery_proof_reports
  for all using (auth.role() = 'service_role');
