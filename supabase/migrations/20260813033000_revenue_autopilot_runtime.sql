-- Revenue Autopilot runtime readiness.
-- Idempotent repair migration: production/dev databases created before some
-- historical growth migrations may be missing the lead/outreach tables even
-- when the application routes already reference them.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'public-chat',
  intent text,
  intent_score integer default 0 check (intent_score between 0 and 100),
  messages jsonb,
  org_id text,
  converted boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.leads
  add column if not exists github_repo text,
  add column if not exists github_stars integer,
  add column if not exists framework text,
  add column if not exists company text,
  add column if not exists job_title text,
  add column if not exists outreach_sent boolean not null default false,
  add column if not exists outreach_sent_at timestamptz,
  add column if not exists source_platform text,
  add column if not exists icp_score integer default 0,
  add column if not exists engagement_score integer default 0,
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_converted boolean not null default false,
  add column if not exists trial_converted_at timestamptz;

-- Re-apply bounded score checks only when they are absent.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.leads'::regclass and conname = 'leads_source_platform_check'
  ) then
    alter table public.leads
      add constraint leads_source_platform_check
      check (source_platform is null or source_platform in ('github', 'twitter', 'reddit'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.leads'::regclass and conname = 'leads_icp_score_check'
  ) then
    alter table public.leads
      add constraint leads_icp_score_check check (icp_score between 0 and 100);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.leads'::regclass and conname = 'leads_engagement_score_check'
  ) then
    alter table public.leads
      add constraint leads_engagement_score_check check (engagement_score between 0 and 100);
  end if;
end $$;

drop index if exists public.leads_email_source_idx;
create unique index if not exists leads_email_source_repo_idx
  on public.leads (email, source, coalesce(github_repo, ''));
create index if not exists leads_converted_idx on public.leads (converted, created_at desc);
create index if not exists leads_outreach_idx on public.leads (outreach_sent, intent, created_at desc);
create index if not exists leads_framework_idx on public.leads (framework, created_at desc);
create index if not exists leads_source_platform_idx on public.leads (source_platform, created_at desc);
create index if not exists leads_icp_score_idx on public.leads (icp_score desc, created_at desc);
create index if not exists leads_trial_converted_idx on public.leads (trial_converted, trial_converted_at desc);
create index if not exists leads_trial_tracking_idx on public.leads (trial_started_at, trial_converted, created_at desc);

alter table public.leads enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'leads' and policyname = 'service role full access'
  ) then
    create policy "service role full access" on public.leads
      for all using (true) with check (true);
  end if;
end $$;

create table if not exists public.outreach_approvals (
  id uuid primary key default gen_random_uuid(),
  lead_email text not null,
  framework text,
  github_repo text,
  github_stars integer,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'sent', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  sent_at timestamptz
);

create index if not exists outreach_approvals_status_idx
  on public.outreach_approvals (status, created_at desc);
create unique index if not exists outreach_approvals_pending_email_uniq
  on public.outreach_approvals (lead_email)
  where status = 'pending';
alter table public.outreach_approvals enable row level security;

-- Scheduler/audit ledger. A unique job+bucket claim gives exactly-once logical
-- execution for successful runs while failed/stale runs can be retried safely.
create table if not exists public.revenue_autopilot_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  bucket text not null,
  source text not null default 'github-oidc',
  status text not null default 'running'
    check (status in ('running', 'success', 'failure', 'skipped')),
  attempts integer not null default 1 check (attempts >= 1),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  http_status integer,
  result jsonb,
  error text,
  unique (job, bucket)
);

create index if not exists revenue_autopilot_runs_status_idx
  on public.revenue_autopilot_runs (status, started_at desc);
create index if not exists revenue_autopilot_runs_job_idx
  on public.revenue_autopilot_runs (job, started_at desc);
alter table public.revenue_autopilot_runs enable row level security;

-- No anon/authenticated policies: service-role only by design.
