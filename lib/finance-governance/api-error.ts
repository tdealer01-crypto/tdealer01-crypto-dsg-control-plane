import { NextResponse } from 'next/server';
import { handleApiError } from '../security/api-error';
import { OrgAuthError } from '../server/getOrg';

const KNOWN_FINANCE_GOVERNANCE_ERRORS: Record<string, number> = {
  missing_org_id: 400,
  case_not_found: 404,
  approval_not_found: 404,
  audit_record_not_found: 404,
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
