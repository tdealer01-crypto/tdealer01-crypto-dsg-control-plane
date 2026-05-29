-- CCVS compliance status reports — separate table for CI-uploaded matrix snapshots.
-- delivery_proof_reports is for live scan results; this table is for CI matrix uploads.
-- Writes come from server-side service_role via POST /api/ccvs/compliance-status.
create table if not exists compliance_status_reports (
  id                  uuid primary key default gen_random_uuid(),
  run_id              text not null unique,
  claim_pass_eligible boolean,
  mutation_score      numeric,
  requirements_pass   int,
  requirements_total  int,
  matrix_json         jsonb,
  last_ci_run         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_compliance_status_run_id
  on compliance_status_reports (run_id);

alter table compliance_status_reports enable row level security;

drop policy if exists public_read on compliance_status_reports;
create policy public_read
  on compliance_status_reports
  for select
  to public
  using (true);

drop policy if exists service_write on compliance_status_reports;
drop policy if exists service_write_upd on compliance_status_reports;
drop policy if exists service_write_del on compliance_status_reports;

create policy service_write
  on compliance_status_reports
  for insert
  to service_role
  with check (true);

create policy service_write_upd
  on compliance_status_reports
  for update
  to service_role
  using (true)
  with check (true);

create policy service_write_del
  on compliance_status_reports
  for delete
  to service_role
  using (true);
