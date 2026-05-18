-- Extend leads table for growth automation sources
alter table public.leads
  add column if not exists github_repo text,
  add column if not exists github_stars integer,
  add column if not exists framework text,
  add column if not exists company text,
  add column if not exists job_title text,
  add column if not exists outreach_sent boolean not null default false,
  add column if not exists outreach_sent_at timestamptz;

-- Drop old unique constraint and recreate to allow multiple sources per email
-- (github-leads may have same email with different repos)
drop index if exists leads_email_source_idx;
create unique index if not exists leads_email_source_repo_idx
  on public.leads (email, source, coalesce(github_repo, ''));

create index if not exists leads_outreach_idx
  on public.leads (outreach_sent, intent, created_at desc);

create index if not exists leads_framework_idx
  on public.leads (framework, created_at desc);
