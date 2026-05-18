-- User milestone tracking for behavioral marketing automation
-- One row per (org_id, milestone) — idempotent insert

create table if not exists public.user_milestones (
  id           bigserial primary key,
  org_id       text not null,
  email        text,
  milestone    text not null,   -- 'agent_connected' | 'first_execution' | 'first_block' | 'team_invited' | 'integration_connected'
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),

  constraint user_milestones_org_milestone unique (org_id, milestone)
);

create index if not exists user_milestones_org_idx on public.user_milestones (org_id);
create index if not exists user_milestones_milestone_idx on public.user_milestones (milestone, created_at desc);

alter table public.user_milestones enable row level security;

-- Track which marketing emails have been sent per org (prevents duplicate behavioral sends)
create table if not exists public.marketing_sends (
  id           bigserial primary key,
  org_id       text not null,
  email        text not null,
  send_key     text not null,   -- e.g. 'behavioral_no_agent_d1', 'behavioral_first_block', 'founder_alert_first_block'
  sent_at      timestamptz not null default now(),

  constraint marketing_sends_org_key unique (org_id, send_key)
);

create index if not exists marketing_sends_org_idx on public.marketing_sends (org_id);

alter table public.marketing_sends enable row level security;
