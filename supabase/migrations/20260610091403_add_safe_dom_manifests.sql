-- Create safe_dom_manifests table for storing Safe DOM manifests with Browserbase integration
create table if not exists safe_dom_manifests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  frame_id text not null,
  manifest_json jsonb not null,
  org_id uuid not null references organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes'),

  unique(session_id, frame_id),
  constraint safe_dom_manifests_expires_at_check check (expires_at > created_at),
  constraint safe_dom_manifests_manifest_json_check check (manifest_json is not null)
);

-- Index for efficient TTL cleanup by expires_at
create index if not exists idx_safe_dom_manifests_expires_at
  on safe_dom_manifests(expires_at);

-- Index for efficient lookup by session and frame
create index if not exists idx_safe_dom_manifests_session_frame
  on safe_dom_manifests(session_id, frame_id);

-- Index for org-scoped queries
create index if not exists idx_safe_dom_manifests_org_id
  on safe_dom_manifests(org_id, created_at desc);

-- Enable RLS for safe_dom_manifests
alter table safe_dom_manifests enable row level security;

-- RLS policy: Allow org members to read their own manifests
create policy "safe_dom_manifests_org_read"
  on safe_dom_manifests
  for select
  using (org_id in (
    select org_id from organizations
    where id = safe_dom_manifests.org_id
  ));

-- RLS policy: Allow authenticated users to create manifests for their org
create policy "safe_dom_manifests_org_insert"
  on safe_dom_manifests
  for insert
  with check (org_id in (
    select org_id from organizations
    where id = safe_dom_manifests.org_id
  ));
