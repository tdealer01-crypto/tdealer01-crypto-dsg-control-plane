-- DSG Control Plane scaffold RLS policies
-- Minimal row-level security posture for authenticated org-scoped reads.

alter table public.users enable row level security;
alter table public.policies enable row level security;
alter table public.agents enable row level security;
alter table public.executions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.usage_events enable row level security;
alter table public.usage_counters enable row level security;

drop policy if exists users_select_self_or_org on public.users;
create policy users_select_self_or_org
  on public.users
  for select
  to authenticated
  using (
    auth_user_id = auth.uid()
    or org_id in (
      select u.org_id from public.users u where u.auth_user_id = auth.uid() and u.is_active = true
    )
  );

drop policy if exists policies_select_authenticated on public.policies;
create policy policies_select_authenticated
  on public.policies
  for select
  to authenticated
  using (true);

drop policy if exists agents_select_same_org on public.agents;
create policy agents_select_same_org
  on public.agents
  for select
  to authenticated
  using (
    org_id in (
      select u.org_id from public.users u where u.auth_user_id = auth.uid() and u.is_active = true
    )
  );

drop policy if exists executions_select_same_org on public.executions;
create policy executions_select_same_org
  on public.executions
  for select
  to authenticated
  using (
    org_id in (
      select u.org_id from public.users u where u.auth_user_id = auth.uid() and u.is_active = true
    )
  );

drop policy if exists audit_logs_select_same_org on public.audit_logs;
create policy audit_logs_select_same_org
  on public.audit_logs
  for select
  to authenticated
  using (
    org_id in (
      select u.org_id from public.users u where u.auth_user_id = auth.uid() and u.is_active = true
    )
  );

drop policy if exists usage_events_select_same_org on public.usage_events;
create policy usage_events_select_same_org
  on public.usage_events
  for select
  to authenticated
  using (
    org_id in (
      select u.org_id from public.users u where u.auth_user_id = auth.uid() and u.is_active = true
    )
  );

drop policy if exists usage_counters_select_same_org on public.usage_counters;
create policy usage_counters_select_same_org
  on public.usage_counters
  for select
  to authenticated
  using (
    org_id in (
      select u.org_id from public.users u where u.auth_user_id = auth.uid() and u.is_active = true
    )
  );
