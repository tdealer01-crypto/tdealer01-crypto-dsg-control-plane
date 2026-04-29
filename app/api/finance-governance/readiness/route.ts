import { NextResponse } from 'next/server';
import { checkFinanceGovernanceReadiness } from '../../../../lib/finance-governance/readiness';
import { handleFinanceGovernanceApiError } from '../../../../lib/finance-governance/api-error';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const readiness = await checkFinanceGovernanceReadiness();
    return NextResponse.json(readiness, { status: readiness.ok ? 200 : 503 });
  } catch (error) {
    return handleFinanceGovernanceApiError('api/finance-governance/readiness', error);
  }
}
