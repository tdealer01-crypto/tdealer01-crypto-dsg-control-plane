-- Email templates table
create table email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  body text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Email sequences (drip campaigns)
create table email_sequences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  trigger_event text not null, -- 'lead_discovered', 'trial_started', 'high_icp_score'
  min_icp_score integer default 0,
  target_platforms text[], -- ['github', 'twitter', 'reddit'] or empty for all
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sequence steps (emails in order)
create table email_sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references email_sequences(id) on delete cascade,
  step_order integer not null,
  delay_days integer not null, -- days after trigger event
  template_id uuid not null references email_templates(id),
  created_at timestamptz default now(),
  unique(sequence_id, step_order)
);

-- Scheduled sends (when/to whom)
create table email_scheduled_sends (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  sequence_id uuid not null references email_sequences(id),
  step_id uuid not null references email_sequence_steps(id),
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  failed boolean default false,
  failure_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Email engagement tracking
create table email_engagement (
  id uuid primary key default gen_random_uuid(),
  scheduled_send_id uuid not null references email_scheduled_sends(id) on delete cascade,
  lead_id uuid not null references leads(id),
  event_type text not null, -- 'opened', 'clicked', 'bounced', 'unsubscribed'
  clicked_link text,
  happened_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Unsubscribe list (prevent sending to opted-out leads)
create table email_unsubscribes (
  id uuid primary key default gen_random_uuid(),
  lead_email text not null,
  reason text,
  created_at timestamptz default now(),
  unique(lead_email)
);

-- RLS policies
alter table email_templates enable row level security;
alter table email_sequences enable row level security;
alter table email_sequence_steps enable row level security;
alter table email_scheduled_sends enable row level security;
alter table email_engagement enable row level security;
alter table email_unsubscribes enable row level security;

-- Allow founder to manage email config
create policy "Founder can manage templates" on email_templates
  for all using (auth.jwt() ->> 'email' = current_setting('app.founder_email'));

create policy "Founder can manage sequences" on email_sequences
  for all using (auth.jwt() ->> 'email' = current_setting('app.founder_email'));

create policy "Founder can manage sequence steps" on email_sequence_steps
  for all using (
    exists (select 1 from email_sequences where id = sequence_id and
            auth.jwt() ->> 'email' = current_setting('app.founder_email'))
  );

create policy "Founder can view sends" on email_scheduled_sends
  for select using (auth.jwt() ->> 'email' = current_setting('app.founder_email'));

create policy "Founder can view engagement" on email_engagement
  for select using (auth.jwt() ->> 'email' = current_setting('app.founder_email'));

create policy "Founder can manage unsubscribes" on email_unsubscribes
  for all using (auth.jwt() ->> 'email' = current_setting('app.founder_email'));

-- Indexes for performance
create index idx_scheduled_sends_scheduled_for on email_scheduled_sends(scheduled_for) where sent_at is null;
create index idx_scheduled_sends_lead_id on email_scheduled_sends(lead_id);
create index idx_engagement_scheduled_send_id on email_engagement(scheduled_send_id);
create index idx_unsubscribes_email on email_unsubscribes(lead_email);
