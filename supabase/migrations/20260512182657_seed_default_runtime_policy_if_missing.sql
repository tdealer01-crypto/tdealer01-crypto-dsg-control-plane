insert into public.runtime_policies (
  org_id,
  name,
  version,
  status,
  thresholds,
  governance_state
)
select
  o.id,
  'Default DSG Runtime Policy',
  'v1',
  'active',
  jsonb_build_object(
    'block_risk_score', 0.8,
    'stabilize_risk_score', 0.4,
    'oscillation_window', 4,
    'audit_mode', true
  ),
  'active_in_production'
from public.organizations o
where not exists (
  select 1
  from public.runtime_policies rp
  where rp.org_id = o.id
);

notify pgrst, 'reload schema';