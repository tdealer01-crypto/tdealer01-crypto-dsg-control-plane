import { NextResponse } from 'next/server';
import { handleFinanceGovernanceApiError } from '../../../../lib/finance-governance/api-error';
import { FinanceGovernanceRepository } from '../../../../lib/finance-governance/repository';
import { getOrg } from '../../../../lib/server/getOrg';

export const dynamic = 'force-dynamic';

const repository = new FinanceGovernanceRepository();

export async function GET() {
  try {
    const orgId = await getOrg();
    const approvals = await repository.getApprovals(orgId);
    return NextResponse.json({ approvals });
  } catch (error) {
    return handleFinanceGovernanceApiError('api/finance-governance', error);
  }
}
