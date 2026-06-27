-- Lead capture from public-chat and landing pages
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

create unique index if not exists leads_email_source_idx on public.leads (email, source);
create index if not exists leads_converted_idx on public.leads (converted, created_at desc);

alter table public.leads enable row level security;

create policy "service role full access" on public.leads
  for all using (true) with check (true);

-- Quota alert cooldown tracking (reuse billing_events concept)
-- alerts stored in billing_events with event_type = 'quota_alert_80' or 'quota_alert_100'
-- No new table needed — billing_events.stripe_event_id = 'quota-{orgId}-{period}-{threshold}'
