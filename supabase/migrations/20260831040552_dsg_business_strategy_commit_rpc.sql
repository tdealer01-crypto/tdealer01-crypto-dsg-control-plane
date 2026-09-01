create or replace function public.dsg_commit_business_strategy_evaluation(
  p_project_id text,
  p_decision text,
  p_final_score integer,
  p_rule_version text,
  p_input_sha256 text,
  p_decision_sha256 text,
  p_remark text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_decision not in ('APPROVED','NEEDS_REVISION','REJECTED','BLOCKED') then
    raise exception 'DSG_BUSINESS_STRATEGY_INVALID_DECISION';
  end if;

  perform 1 from public.dsg_business_strategy_projects
   where project_id = p_project_id and evaluation_status = 'PENDING'
   for update;
  if not found then
    raise exception 'DSG_BUSINESS_STRATEGY_PROJECT_NOT_PENDING';
  end if;

  insert into public.dsg_business_strategy_evaluations(
    project_id, decision, final_score, rule_version, input_sha256, decision_sha256, remark
  ) values (
    p_project_id, p_decision, p_final_score, p_rule_version, p_input_sha256, p_decision_sha256, p_remark
  );

  update public.dsg_business_strategy_projects
     set evaluation_status = p_decision, updated_at = now()
   where project_id = p_project_id;
end;
$$;
revoke all on function public.dsg_commit_business_strategy_evaluation(text,text,integer,text,text,text,text) from public, anon, authenticated;
grant execute on function public.dsg_commit_business_strategy_evaluation(text,text,integer,text,text,text,text) to service_role;
