alter table if exists access_requests
  add column if not exists org_id text null references organizations(id) on delete set null;

create index if not exists idx_access_requests_org_status on access_requests(org_id, status);
