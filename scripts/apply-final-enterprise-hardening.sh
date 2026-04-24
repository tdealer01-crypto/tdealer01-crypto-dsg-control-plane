#!/usr/bin/env bash
set -euo pipefail

echo "== DSG final enterprise finance governance hardening =="

python3 <<'PY'
from pathlib import Path
import re

def read(path: str) -> str:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"missing file: {path}")
    return p.read_text(encoding="utf-8")

def write(path: str, content: str) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print(f"updated {path}")

def replace_once(content: str, old: str, new: str, label: str) -> str:
    if old not in content:
        print(f"skip {label}: pattern not found")
        return content
    return content.replace(old, new, 1)

# --------------------------------------------------------------------
# 1) Finance governance API-safe error handler
# --------------------------------------------------------------------
write(
    "lib/finance-governance/api-error.ts",
    """import { NextResponse } from 'next/server';
import { handleApiError } from '../security/api-error';

const KNOWN_FINANCE_GOVERNANCE_ERRORS: Record<string, number> = {
  missing_org_id: 400,
  case_not_found: 404,
  approval_not_found: 404,
};

export function handleFinanceGovernanceApiError(route: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'unknown_error';
  const knownStatus = KNOWN_FINANCE_GOVERNANCE_ERRORS[message];

  if (knownStatus) {
    return NextResponse.json({ ok: false, error: message }, { status: knownStatus });
  }

  return handleApiError(route, error);
}
""",
)

# --------------------------------------------------------------------
# 2) Patch finance governance API routes to use safe error handler
# --------------------------------------------------------------------
route_imports = {
    "app/api/finance-governance/approvals/route.ts": "../../../../lib/finance-governance/api-error",
    "app/api/finance-governance/approvals/[id]/approve/route.ts": "../../../../../../lib/finance-governance/api-error",
    "app/api/finance-governance/approvals/[id]/reject/route.ts": "../../../../../../lib/finance-governance/api-error",
    "app/api/finance-governance/approvals/[id]/escalate/route.ts": "../../../../../../lib/finance-governance/api-error",
    "app/api/finance-governance/cases/[id]/route.ts": "../../../../../lib/finance-governance/api-error",
    "app/api/finance-governance/cases/[id]/decisions/route.ts": "../../../../../../lib/finance-governance/api-error",
    "app/api/finance-governance/cases/[id]/exceptions/route.ts": "../../../../../../lib/finance-governance/api-error",
    "app/api/finance-governance/cases/[id]/evidence/route.ts": "../../../../../../lib/finance-governance/api-error",
    "app/api/finance-governance/onboarding/route.ts": "../../../../lib/finance-governance/api-error",
    "app/api/finance-governance/submit/route.ts": "../../../../lib/finance-governance/api-error",
    "app/api/finance-governance/workspace/summary/route.ts": "../../../../../lib/finance-governance/api-error",
}

catch_pattern = re.compile(
    r"""  \} catch \(error\) \{
    const message = error instanceof Error \? error\.message : 'unknown_error';
(?:    const status = [^\n]+;\n)?    return NextResponse\.json\(\{ ok: false, error: message \}, \{ status(?:: 500)? \}\);
  \}""",
    re.MULTILINE,
)

for path, import_path in route_imports.items():
    p = Path(path)
    if not p.exists():
        print(f"skip route missing: {path}")
        continue

    s = read(path)

    import_line = f"import {{ handleFinanceGovernanceApiError }} from '{import_path}';"
    if "handleFinanceGovernanceApiError" not in s:
        s = s.replace("import { NextResponse } from 'next/server';", "import { NextResponse } from 'next/server';\n" + import_line, 1)

    s2 = catch_pattern.sub(
        "  } catch (error) {\n    return handleFinanceGovernanceApiError('api/finance-governance', error);\n  }",
        s,
    )

    if s2 == s:
        print(f"skip catch replacement maybe already patched: {path}")
    write(path, s2)

# --------------------------------------------------------------------
# 3) Fix readiness boolean parsing
# --------------------------------------------------------------------
readiness_path = "lib/deployment/readiness.ts"
s = read(readiness_path)

if "function parseBooleanFlag" not in s:
    s = s.replace(
        """function buildCheck(ok: boolean, detail?: string): CheckResult {
  return { ok, ...(detail ? { detail } : {}) };
}
""",
        """function buildCheck(ok: boolean, detail?: string): CheckResult {
  return { ok, ...(detail ? { detail } : {}) };
}

function parseBooleanFlag(value: string | undefined, fallback: boolean) {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}
""",
        1,
    )

s = re.sub(
    r"""  const financeGovernanceSurface = buildCheck\(
    Boolean\(process\.env\.DSG_FINANCE_GOVERNANCE_ENABLED \?\? 'true'\),
    process\.env\.DSG_FINANCE_GOVERNANCE_ENABLED === 'false' \? 'finance_governance_disabled' : undefined
  \);""",
    """  const financeGovernanceEnabled = parseBooleanFlag(process.env.DSG_FINANCE_GOVERNANCE_ENABLED, true);
  const financeGovernanceSurface = buildCheck(
    financeGovernanceEnabled,
    financeGovernanceEnabled ? undefined : 'finance_governance_disabled'
  );""",
    s,
)

write(readiness_path, s)

# --------------------------------------------------------------------
# 4) Harden finance governance migration:
#    - guard legacy backfill
#    - add indexes / constraints / triggers / RLS baseline
# --------------------------------------------------------------------
migration_path = "supabase/migrations/20260424010000_finance_governance_control_layer.sql"
s = read(migration_path)

legacy_backfill = """insert into public.finance_transactions (id, org_id, workflow_case_id, vendor, amount, currency, status)
select c.id, c.org_id, c.id, c.vendor, c.amount, c.currency, c.status
from public.finance_workflow_cases c
on conflict (id) do nothing;

insert into public.finance_approval_requests (id, org_id, transaction_id, status, risk)
select a.id, a.org_id, a.case_id, a.status, a.risk
from public.finance_workflow_approvals a
where exists (select 1 from public.finance_transactions t where t.id = a.case_id)
on conflict (id) do nothing;
"""

guarded_backfill = """do $$
begin
  if to_regclass('public.finance_workflow_cases') is not null then
    insert into public.finance_transactions (id, org_id, workflow_case_id, vendor, amount, currency, status)
    select c.id, c.org_id, c.id, c.vendor, c.amount, c.currency, c.status
    from public.finance_workflow_cases c
    on conflict (id) do nothing;
  end if;

  if to_regclass('public.finance_workflow_approvals') is not null then
    insert into public.finance_approval_requests (id, org_id, transaction_id, status, risk)
    select a.id, a.org_id, a.case_id, a.status, a.risk
    from public.finance_workflow_approvals a
    where exists (select 1 from public.finance_transactions t where t.id = a.case_id)
    on conflict (id) do nothing;
  end if;
end $$;
"""

if legacy_backfill in s:
    s = s.replace(legacy_backfill, guarded_backfill, 1)
elif "to_regclass('public.finance_workflow_cases')" in s:
    print("migration backfill already guarded")
else:
    print("warning: legacy backfill block not found")

schema_hardening = r"""
create index if not exists idx_finance_transactions_org_status
  on public.finance_transactions (org_id, status, updated_at desc);
create index if not exists idx_finance_transactions_workflow_case_id
  on public.finance_transactions (workflow_case_id);
create index if not exists idx_finance_approval_requests_org_status
  on public.finance_approval_requests (org_id, status, updated_at desc);
create index if not exists idx_finance_approval_requests_org_transaction
  on public.finance_approval_requests (org_id, transaction_id);
create index if not exists idx_finance_approval_steps_org_approval
  on public.finance_approval_steps (org_id, approval_request_id, step_order);
create index if not exists idx_finance_approval_decisions_org_approval
  on public.finance_approval_decisions (org_id, approval_request_id, created_at desc);
create index if not exists idx_finance_exceptions_org_approval
  on public.finance_exceptions (org_id, approval_request_id, created_at desc);
create index if not exists idx_finance_evidence_bundles_org_approval
  on public.finance_evidence_bundles (org_id, approval_request_id, created_at desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'finance_transactions_amount_nonnegative') then
    alter table public.finance_transactions
      add constraint finance_transactions_amount_nonnegative check (amount >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'finance_approval_requests_status_valid') then
    alter table public.finance_approval_requests
      add constraint finance_approval_requests_status_valid
      check (status in ('pending', 'approved', 'rejected', 'escalated', 'in_review'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'finance_approval_steps_status_valid') then
    alter table public.finance_approval_steps
      add constraint finance_approval_steps_status_valid
      check (status in ('pending', 'approved', 'rejected', 'skipped', 'in_progress'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'finance_approval_decisions_decision_valid') then
    alter table public.finance_approval_decisions
      add constraint finance_approval_decisions_decision_valid
      check (decision in ('approve', 'reject', 'escalate'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'finance_exceptions_status_valid') then
    alter table public.finance_exceptions
      add constraint finance_exceptions_status_valid
      check (status in ('open', 'resolved'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'finance_evidence_bundles_status_valid') then
    alter table public.finance_evidence_bundles
      add constraint finance_evidence_bundles_status_valid
      check (status in ('ready', 'building', 'failed'));
  end if;
end $$;

create or replace function public.set_finance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_finance_transactions_updated_at on public.finance_transactions;
create trigger trg_finance_transactions_updated_at
before update on public.finance_transactions
for each row execute function public.set_finance_updated_at();

drop trigger if exists trg_finance_approval_requests_updated_at on public.finance_approval_requests;
create trigger trg_finance_approval_requests_updated_at
before update on public.finance_approval_requests
for each row execute function public.set_finance_updated_at();

alter table public.finance_transactions enable row level security;
alter table public.finance_approval_requests enable row level security;
alter table public.finance_approval_steps enable row level security;
alter table public.finance_approval_decisions enable row level security;
alter table public.finance_exceptions enable row level security;
alter table public.finance_evidence_bundles enable row level security;
alter table public.finance_export_jobs enable row level security;

drop policy if exists finance_transactions_org_select on public.finance_transactions;
create policy finance_transactions_org_select
on public.finance_transactions
for select
to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists finance_approval_requests_org_select on public.finance_approval_requests;
create policy finance_approval_requests_org_select
on public.finance_approval_requests
for select
to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists finance_approval_steps_org_select on public.finance_approval_steps;
create policy finance_approval_steps_org_select
on public.finance_approval_steps
for select
to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists finance_approval_decisions_org_select on public.finance_approval_decisions;
create policy finance_approval_decisions_org_select
on public.finance_approval_decisions
for select
to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists finance_exceptions_org_select on public.finance_exceptions;
create policy finance_exceptions_org_select
on public.finance_exceptions
for select
to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists finance_evidence_bundles_org_select on public.finance_evidence_bundles;
create policy finance_evidence_bundles_org_select
on public.finance_evidence_bundles
for select
to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));
"""

if "idx_finance_transactions_org_status" not in s:
    s = s.rstrip() + "\n\n" + schema_hardening.strip() + "\n"
else:
    print("migration schema hardening already present")

write(migration_path, s)

# --------------------------------------------------------------------
# 5) Patch FinanceGovernanceRepository for ID mapping + evidence timing
# --------------------------------------------------------------------
repo_path = "lib/finance-governance/repository.ts"
s = read(repo_path)

# getCaseDetail: resolve approval id / transaction id
s = replace_once(
    s,
    """    if (await this.hasControlLayerTables(supabase)) {
      const { data: row, error } = await supabase
        .from('finance_transactions')
        .select('id,status,vendor,amount,currency')
        .eq('org_id', orgId)
        .eq('id', id)
        .maybeSingle();""",
    """    if (await this.hasControlLayerTables(supabase)) {
      const mapping = await this.resolveApprovalMapping(orgId, id, supabase);
      const transactionId = mapping?.transactionId ?? id;
      const { data: row, error } = await supabase
        .from('finance_transactions')
        .select('id,status,vendor,amount,currency')
        .eq('org_id', orgId)
        .eq('id', transactionId)
        .maybeSingle();""",
    "getCaseDetail transaction mapping",
)

s = replace_once(
    s,
    """      if (!error && row) {
        const { data: decisions } = await supabase
          .from('finance_approval_decisions')
          .select('decision,reason')
          .eq('org_id', orgId)
          .eq('approval_request_id', id)
          .order('created_at', { ascending: true });""",
    """      if (!error && row) {
        const approvalRequestId = mapping?.approvalId ?? await this.resolveApprovalRequestId(orgId, row.id, supabase);
        const { data: decisions } = await supabase
          .from('finance_approval_decisions')
          .select('decision,reason')
          .eq('org_id', orgId)
          .eq('approval_request_id', approvalRequestId ?? id)
          .order('created_at', { ascending: true });""",
    "getCaseDetail approval mapping",
)

# case-level detail methods: map case id / approval id / workflow case id to approval request id
for method_name in ["getDecisions", "getExceptions", "getEvidenceBundles"]:
    needle = f"""  async {method_name}(orgId: string, caseOrApprovalId: string) {{
    const supabase = getSupabaseAdmin() as any;

    if (await this.hasControlLayerTables(supabase)) {{"""
    replacement = f"""  async {method_name}(orgId: string, caseOrApprovalId: string) {{
    const supabase = getSupabaseAdmin() as any;

    if (await this.hasControlLayerTables(supabase)) {{
      const approvalId = await this.resolveApprovalReference(orgId, caseOrApprovalId, supabase);"""
    if needle in s and "const approvalId = await this.resolveApprovalReference(orgId, caseOrApprovalId, supabase);" not in s[s.find(needle):s.find(needle)+500]:
        s = s.replace(needle, replacement, 1)

s = s.replace(".eq('approval_request_id', caseOrApprovalId)", ".eq('approval_request_id', approvalId)")

# applyAction: map approval id to transaction id before writes
s = replace_once(
    s,
    """    if (useControlLayer) {
      const now = new Date().toISOString();""",
    """    if (useControlLayer) {
      const mapping = await this.resolveApprovalMapping(orgId, approvalId, supabase);
      if (!mapping) {
        throw new Error('approval_not_found');
      }

      const now = new Date().toISOString();""",
    "applyAction mapping",
)

s = s.replace("approval_request_id: approvalId,", "approval_request_id: mapping.approvalId,")
s = s.replace("uri: `evidence://${approvalId}`", "uri: `evidence://${mapping.approvalId}`")

s = replace_once(
    s,
    """        .eq('id', approvalId);

      await supabase
        .from('finance_transactions')
        .update({ status: result.nextStatus, updated_at: now })
        .eq('org_id', orgId)
        .eq('id', approvalId);""",
    """        .eq('id', mapping.approvalId);

      await supabase
        .from('finance_transactions')
        .update({ status: result.nextStatus, updated_at: now })
        .eq('org_id', orgId)
        .eq('id', mapping.transactionId);""",
    "applyAction update ids",
)

s = s.replace(
    "if (action === 'approve') {",
    "if (action === 'approve' && await this.canCreateFinalEvidenceBundle(orgId, mapping.approvalId, supabase)) {",
    1,
)

helper_methods = """
  private async resolveApprovalReference(orgId: string, id: string, supabase: any): Promise<string> {
    const mapping = await this.resolveApprovalMapping(orgId, id, supabase);
    if (!mapping) {
      throw new Error('approval_not_found');
    }
    return mapping.approvalId;
  }

  private async resolveApprovalRequestId(orgId: string, transactionId: string, supabase: any): Promise<string | null> {
    const { data } = await supabase
      .from('finance_approval_requests')
      .select('id')
      .eq('org_id', orgId)
      .eq('transaction_id', transactionId)
      .maybeSingle();

    return data?.id ?? null;
  }

  private async resolveApprovalMapping(
    orgId: string,
    id: string,
    supabase: any
  ): Promise<{ approvalId: string; transactionId: string } | null> {
    const { data: direct } = await supabase
      .from('finance_approval_requests')
      .select('id,transaction_id')
      .eq('org_id', orgId)
      .eq('id', id)
      .maybeSingle();

    if (direct?.id && direct?.transaction_id) {
      return { approvalId: direct.id, transactionId: direct.transaction_id };
    }

    const { data: byTransaction } = await supabase
      .from('finance_approval_requests')
      .select('id,transaction_id')
      .eq('org_id', orgId)
      .eq('transaction_id', id)
      .maybeSingle();

    if (byTransaction?.id && byTransaction?.transaction_id) {
      return { approvalId: byTransaction.id, transactionId: byTransaction.transaction_id };
    }

    const { data: byWorkflowCase } = await supabase
      .from('finance_transactions')
      .select('id')
      .eq('org_id', orgId)
      .eq('workflow_case_id', id)
      .maybeSingle();

    if (!byWorkflowCase?.id) {
      return null;
    }

    const { data: byCaseTransaction } = await supabase
      .from('finance_approval_requests')
      .select('id,transaction_id')
      .eq('org_id', orgId)
      .eq('transaction_id', byWorkflowCase.id)
      .maybeSingle();

    if (byCaseTransaction?.id && byCaseTransaction?.transaction_id) {
      return { approvalId: byCaseTransaction.id, transactionId: byCaseTransaction.transaction_id };
    }

    return null;
  }

  private async canCreateFinalEvidenceBundle(orgId: string, approvalId: string, supabase: any): Promise<boolean> {
    const { data: steps, error } = await supabase
      .from('finance_approval_steps')
      .select('status')
      .eq('org_id', orgId)
      .eq('approval_request_id', approvalId);

    if (error || !Array.isArray(steps) || steps.length === 0) {
      return false;
    }

    return steps.every((step: { status: string }) => step.status === 'approved');
  }
"""

if "private async resolveApprovalReference" not in s:
    head, tail = s.rsplit("\n}", 1)
    s = head.rstrip() + "\n" + helper_methods + "\n}" + tail

write(repo_path, s)

# --------------------------------------------------------------------
# 6) PR body
# --------------------------------------------------------------------
write(
    "docs/pr/PR_FINAL_ENTERPRISE_LAUNCH_HARDENING.md",
    """# Final PR: Enterprise Launch Hardening (Finance Governance)

## Summary
- Fix `/api/readiness` boolean parsing for `DSG_FINANCE_GOVERNANCE_ENABLED=false`.
- Make finance governance migration resilient on fresh Supabase projects by guarding legacy backfill with `to_regclass(...)`.
- Harden finance governance schema with RLS baseline, org-scoped authenticated select policies, indexes, constraints, and `updated_at` triggers.
- Fix approval action ID mapping by resolving approval request IDs to `transaction_id` before transaction updates.
- Improve case detail/decision/exception/evidence lookups so they accept transaction IDs, case IDs, or approval request IDs.
- Defer final evidence bundle generation until required approval steps are fully completed.
- Standardize finance governance API error handling so known domain errors remain explicit and unknown/internal errors pass through safe error handling.

## Why this PR
This PR closes launch-blocking reliability and data-safety gaps after the base finance governance merge:
- false-positive readiness gating from string booleans,
- migration failure on new database projects with no legacy tables,
- incorrect row updates when action IDs were treated as transaction IDs,
- brittle case/evidence lookup behavior when queue inputs used approval IDs,
- premature evidence bundle creation,
- and inconsistent API error behavior for unknown internal failures.

## Validation checklist
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Apply Supabase migration on staging
- [ ] Hit `/api/readiness` and confirm HTTP 200
""",
)

print("final enterprise hardening patch applied")
PY

echo ""
echo "== Checking formatting diff =="
git diff --check

echo ""
echo "== Suggested validation =="
echo "npm ci"
echo "npm run typecheck"
echo "npm test"
echo "npm run build"

echo ""
echo "== Suggested commit =="
echo "git add ."
echo "git commit -m \"Final enterprise finance governance launch hardening\""
