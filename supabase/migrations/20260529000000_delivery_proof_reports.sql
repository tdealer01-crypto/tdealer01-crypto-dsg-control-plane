-- Delivery Proof: persisted compliance status reports (replaces in-memory cache)
-- Writes come from server-side service_role (bypasses RLS by default).
-- RLS is enabled for defence-in-depth; anon/authenticated roles can only SELECT.
create table if not exists delivery_proof_reports (
  id                  uuid primary key default gen_random_uuid(),
  run_id              text not null unique,
  claim_pass_eligible boolean not null,
  mutation_score      numeric,
  requirements_pass   int,
  requirements_total  int,
  matrix_json         jsonb,
  last_ci_run         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_delivery_proof_run_id
  on delivery_proof_reports (run_id);

alter table delivery_proof_reports enable row level security;

-- Anyone with run_id can read the report (shareable link)
drop policy if exists public_read on delivery_proof_reports;
create policy public_read
  on delivery_proof_reports
  for select
  to public
  using (true);

-- service_role bypasses RLS automatically, but explicit policies document intent
-- and guard against accidental anon-key writes in tests.
drop policy if exists service_write on delivery_proof_reports;
drop policy if exists service_write_upd on delivery_proof_reports;
drop policy if exists service_write_del on delivery_proof_reports;

create policy service_write
  on delivery_proof_reports
  for insert
  to service_role
  with check (true);

create policy service_write_upd
  on delivery_proof_reports
  for update
  to service_role
  using (true)
  with check (true);

create policy service_write_del
  on delivery_proof_reports
  for delete
  to service_role
  using (true);
