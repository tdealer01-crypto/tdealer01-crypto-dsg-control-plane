alter table public.runtime_truth_states enable row level security;
alter table public.runtime_approval_requests enable row level security;
alter table public.runtime_ledger_entries enable row level security;
alter table public.runtime_effects enable row level security;
alter table public.runtime_checkpoints enable row level security;

alter table public.runtime_truth_states force row level security;
alter table public.runtime_approval_requests force row level security;
alter table public.runtime_ledger_entries force row level security;
alter table public.runtime_effects force row level security;
alter table public.runtime_checkpoints force row level security;

revoke all on public.runtime_truth_states from anon;
revoke all on public.runtime_approval_requests from anon;
revoke all on public.runtime_ledger_entries from anon;
revoke all on public.runtime_effects from anon;
revoke all on public.runtime_checkpoints from anon;

grant select on public.runtime_truth_states to authenticated;
grant select on public.runtime_approval_requests to authenticated;
grant select on public.runtime_ledger_entries to authenticated;
grant select on public.runtime_effects to authenticated;
grant select on public.runtime_checkpoints to authenticated;

drop policy if exists runtime_truth_states_select_same_org on public.runtime_truth_states;
drop policy if exists runtime_truth_states_select_org on public.runtime_truth_states;
create policy runtime_truth_states_select_org
  on public.runtime_truth_states
  for select
  to authenticated
  using (
    public.current_user_is_active()
    and org_id = public.current_user_org_id()
  );

drop policy if exists runtime_approval_requests_select_same_org on public.runtime_approval_requests;
drop policy if exists runtime_approval_requests_select_org on public.runtime_approval_requests;
create policy runtime_approval_requests_select_org
  on public.runtime_approval_requests
  for select
  to authenticated
  using (
    public.current_user_is_active()
    and org_id = public.current_user_org_id()
  );

drop policy if exists runtime_ledger_entries_select_same_org on public.runtime_ledger_entries;
drop policy if exists runtime_ledger_entries_select_org on public.runtime_ledger_entries;
create policy runtime_ledger_entries_select_org
  on public.runtime_ledger_entries
  for select
  to authenticated
  using (
    public.current_user_is_active()
    and org_id = public.current_user_org_id()
  );

drop policy if exists runtime_effects_select_same_org on public.runtime_effects;
drop policy if exists runtime_effects_select_org on public.runtime_effects;
create policy runtime_effects_select_org
  on public.runtime_effects
  for select
  to authenticated
  using (
    public.current_user_is_active()
    and org_id = public.current_user_org_id()
  );

drop policy if exists runtime_checkpoints_select_same_org on public.runtime_checkpoints;
drop policy if exists runtime_checkpoints_select_org on public.runtime_checkpoints;
create policy runtime_checkpoints_select_org
  on public.runtime_checkpoints
  for select
  to authenticated
  using (
    public.current_user_is_active()
    and org_id = public.current_user_org_id()
  );
