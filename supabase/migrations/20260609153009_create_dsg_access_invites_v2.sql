create table if not exists public.dsg_access_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  purpose text not null default 'customer_access',
  workspace_id uuid null references public.dsg_workspaces(id) on delete set null,
  role text not null default 'VIEWER',
  status text not null default 'active',
  source text not null default 'manual',
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dsg_access_invites_email_check check (position('@' in email) > 1),
  constraint dsg_access_invites_role_check check (role in ('OWNER','ADMIN','OPERATOR','AUDITOR','VIEWER')),
  constraint dsg_access_invites_status_check check (status in ('active','inactive','used','revoked'))
);

create unique index if not exists dsg_access_invites_email_purpose_unique_idx
on public.dsg_access_invites (lower(email), purpose);

create index if not exists dsg_access_invites_active_email_idx
on public.dsg_access_invites (lower(email), status);;
