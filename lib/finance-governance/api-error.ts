import { NextResponse } from 'next/server';
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
