-- DSG Control Plane RLS hardening
-- Adds reusable auth helpers, narrows row visibility, and removes overly broad
-- org-wide access to the users table while preserving route expectations.

create or replace function public.current_auth_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;

create or replace function public.current_user_org_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.org_id
  from public.users u
  where u.auth_user_id = auth.uid()
    and u.is_active = true
  order by u.created_at asc
  limit 1
$$;

create or replace function public.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.is_active = true
  )
$$;

revoke all on function public.current_auth_user_id() from public;
revoke all on function public.current_user_org_id() from public;
revoke all on function public.current_user_is_active() from public;

grant execute on function public.current_auth_user_id() to authenticated;
grant execute on function public.current_user_org_id() to authenticated;
grant execute on function public.current_user_is_active() to authenticated;

revoke all on public.users from anon;
revoke all on public.policies from anon;
revoke all on public.agents from anon;
revoke all on public.executions from anon;
revoke all on public.audit_logs from anon;
revoke all on public.usage_events from anon;
revoke all on public.usage_counters from anon;

grant select on public.users to authenticated;
grant select on public.policies to authenticated;
grant select on public.agents to authenticated;
grant select on public.executions to authenticated;
grant select on public.audit_logs to authenticated;
grant select on public.usage_events to authenticated;
grant select on public.usage_counters to authenticated;

alter table public.users force row level security;
alter table public.policies force row level security;
alter table public.agents force row level security;
alter table public.executions force row level security;
alter table public.audit_logs force row level security;
alter table public.usage_events force row level security;
alter table public.usage_counters force row level security;

drop policy if exists users_select_self_or_org on public.users;
drop policy if exists users_select_self on public.users;
create policy users_select_self
  on public.users
  for select
  to authenticated
  using (
    auth_user_id = public.current_auth_user_id()
  );

drop policy if exists policies_select_authenticated on public.policies;
drop policy if exists policies_select_active_user on public.policies;
create policy policies_select_active_user
  on public.policies
  for select
  to authenticated
  using (public.current_user_is_active());

drop policy if exists agents_select_same_org on public.agents;
drop policy if exists agents_select_active_user_same_org on public.agents;
create policy agents_select_active_user_same_org
  on public.agents
  for select
  to authenticated
  using (
    public.current_user_is_active()
    and org_id = public.current_user_org_id()
  );

drop policy if exists executions_select_same_org on public.executions;
drop policy if exists executions_select_active_user_same_org on public.executions;
create policy executions_select_active_user_same_org
  on public.executions
  for select
  to authenticated
  using (
    public.current_user_is_active()
    and org_id = public.current_user_org_id()
  );

drop policy if exists audit_logs_select_same_org on public.audit_logs;
drop policy if exists audit_logs_select_active_user_same_org on public.audit_logs;
create policy audit_logs_select_active_user_same_org
  on public.audit_logs
  for select
  to authenticated
  using (
    public.current_user_is_active()
    and org_id = public.current_user_org_id()
  );

drop policy if exists usage_events_select_same_org on public.usage_events;
drop policy if exists usage_events_select_active_user_same_org on public.usage_events;
create policy usage_events_select_active_user_same_org
  on public.usage_events
  for select
  to authenticated
  using (
    public.current_user_is_active()
    and org_id = public.current_user_org_id()
  );

drop policy if exists usage_counters_select_same_org on public.usage_counters;
drop policy if exists usage_counters_select_active_user_same_org on public.usage_counters;
create policy usage_counters_select_active_user_same_org
  on public.usage_counters
  for select
  to authenticated
  using (
    public.current_user_is_active()
    and org_id = public.current_user_org_id()
  );
