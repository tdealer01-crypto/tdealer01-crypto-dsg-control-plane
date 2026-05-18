import { NextResponse } from 'next/server';
import { handleApiError } from '../security/api-error';
import { OrgAuthError } from '../server/getOrg';

const KNOWN_FINANCE_GOVERNANCE_ERRORS: Record<string, number> = {
  missing_org_id: 400,
  case_not_found: 404,
  approval_not_found: 404,
  audit_record_not_found: 404,
  missing_actor_role: 403,
  missing_org_plan: 403,
  role_not_allowed: 403,
  plan_not_entitled: 402,
  finance_governance_access_denied: 403,
};

export function handleFinanceGovernanceApiError(route: string, error: unknown) {
  if (error instanceof OrgAuthError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : 'unknown_error';
  const knownStatus = KNOWN_FINANCE_GOVERNANCE_ERRORS[message];

  if (knownStatus) {
    return NextResponse.json({ ok: false, error: message }, { status: knownStatus });
  }

  return handleApiError(route, error);
}
