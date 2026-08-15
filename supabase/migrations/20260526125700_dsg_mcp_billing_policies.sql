do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dsg_mcp_api_keys'
      and policyname = 'actor sees own keys'
  ) then
    create policy "actor sees own keys"
      on public.dsg_mcp_api_keys for select
      using (actor_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dsg_mcp_usage'
      and policyname = 'actor sees own usage'
  ) then
    create policy "actor sees own usage"
      on public.dsg_mcp_usage for select
      using (actor_id = auth.uid());
  end if;
end $$;;
