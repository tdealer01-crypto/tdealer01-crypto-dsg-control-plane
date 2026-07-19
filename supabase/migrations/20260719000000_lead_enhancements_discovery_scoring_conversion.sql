-- Add columns for Twitter/Reddit discovery, ICP scoring, and trial-to-paid conversion tracking
alter table public.leads
  add column if not exists source_platform text check (source_platform in ('github', 'twitter', 'reddit')),
  add column if not exists icp_score integer default 0 check (icp_score between 0 and 100),
  add column if not exists engagement_score integer default 0 check (engagement_score between 0 and 100),
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_converted boolean not null default false,
  add column if not exists trial_converted_at timestamptz;

-- Create indexes for discovery and tracking queries
create index if not exists leads_source_platform_idx
  on public.leads (source_platform, created_at desc);

create index if not exists leads_icp_score_idx
  on public.leads (icp_score desc, created_at desc);

create index if not exists leads_trial_converted_idx
  on public.leads (trial_converted, trial_converted_at desc);

create index if not exists leads_trial_tracking_idx
  on public.leads (trial_started_at, trial_converted, created_at desc);
