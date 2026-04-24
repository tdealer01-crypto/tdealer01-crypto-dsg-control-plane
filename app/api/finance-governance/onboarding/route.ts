import { NextResponse } from 'next/server';
import { handleFinanceGovernanceApiError } from '../../../../lib/finance-governance/api-error';
import { getOnboardingSteps } from '../../../../lib/finance-governance/mock-data';
import { resolveOrgId } from '../../../../lib/finance-governance/org-scope';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    resolveOrgId(request);
    return NextResponse.json({
      steps: getOnboardingSteps(),
    });
  } catch (error) {
    return handleFinanceGovernanceApiError('api/finance-governance', error);
  }
}
