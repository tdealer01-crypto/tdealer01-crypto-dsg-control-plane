create table if not exists public.trial_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  workspace_name text not null,
  full_name text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_trial_signups_email_status
  on public.trial_signups (email, status, created_at desc);

create unique index if not exists idx_trial_signups_completed_email
  on public.trial_signups (email)
  where status = 'completed';
