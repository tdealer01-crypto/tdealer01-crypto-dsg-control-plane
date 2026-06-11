-- Create agi_review_gates table for operator review workflow
-- Tracks human approval/rejection of high-risk agent actions

create table if not exists public.agi_review_gates (
  id uuid primary key default gen_random_uuid(),
  decision_id text not null,
  reviewer_id uuid not null,
  status text not null default 'PENDING',
  reason text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint agi_review_gates_status_check check (status in ('PENDING', 'APPROVED', 'BLOCKED', 'DELEGATED'))
);

-- Create index for fast lookups by decision_id
create index if not exists idx_agi_review_gates_decision on public.agi_review_gates(decision_id);

-- Create index for reviewer history
create index if not exists idx_agi_review_gates_reviewer on public.agi_review_gates(reviewer_id, created_at desc);

-- Create index for pending reviews (common query)
create index if not exists idx_agi_review_gates_pending on public.agi_review_gates(status) where status = 'PENDING';

-- Enable RLS for security
alter table public.agi_review_gates enable row level security;

-- RLS policy: allow authenticated users to read review gates for their org
drop policy if exists agi_review_gates_select on public.agi_review_gates;
create policy agi_review_gates_select on public.agi_review_gates for select to authenticated using (
  exists (
    select 1 from public.users u
    where u.auth_user_id::text = auth.uid()::text
    and u.is_active = true
  )
);

-- RLS policy: allow users to insert review gate decisions (reviewer creates the record)
drop policy if exists agi_review_gates_insert on public.agi_review_gates;
create policy agi_review_gates_insert on public.agi_review_gates for insert to authenticated with check (
  exists (
    select 1 from public.users u
    where u.auth_user_id::text = auth.uid()::text
    and u.is_active = true
  )
);

-- RLS policy: allow users to update their own review gates
drop policy if exists agi_review_gates_update on public.agi_review_gates;
create policy agi_review_gates_update on public.agi_review_gates for update to authenticated using (
  reviewer_id = auth.uid()::uuid
) with check (
  reviewer_id = auth.uid()::uuid
);
