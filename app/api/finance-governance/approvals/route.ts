import { NextResponse } from 'next/server';
import { handleFinanceGovernanceApiError } from '../../../../lib/finance-governance/api-error';
import { resolveOrgId } from '../../../../lib/finance-governance/org-scope';
import { FinanceGovernanceRepository } from '../../../../lib/finance-governance/repository';

export const dynamic = 'force-dynamic';

const repository = new FinanceGovernanceRepository();

export async function GET(request: Request) {
  try {
    const orgId = resolveOrgId(request);
    const approvals = await repository.getApprovals(orgId);
    return NextResponse.json({ approvals });
  } catch (error) {
    return handleFinanceGovernanceApiError('api/finance-governance', error);
  }
}
