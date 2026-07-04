-- Outreach approval queue: human-in-the-loop gate for marketing-agent emails.
-- When MARKETING_OUTREACH_MODE=queue, send_outreach_to_lead inserts here
-- instead of sending; POST /api/marketing/outreach/approve sends approved rows.
-- Idempotent: safe to run via dashboard/manual recovery.

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

-- Service-role only: no anon/authenticated policies on purpose.
-- The admin client (service role) bypasses RLS; everyone else is denied.
