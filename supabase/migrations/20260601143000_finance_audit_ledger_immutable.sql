create or replace trigger prevent_update_finance_governance_audit_ledger
  before update on public.finance_governance_audit_ledger
  for each row
  execute function public.raise_immutable_record('Cannot update finance_governance_audit_ledger');

create or replace trigger prevent_delete_finance_governance_audit_ledger
  before delete on public.finance_governance_audit_ledger
  for each row
  execute function public.raise_immutable_record('Cannot delete finance_governance_audit_ledger');
