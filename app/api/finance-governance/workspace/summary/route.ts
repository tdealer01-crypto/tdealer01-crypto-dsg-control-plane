import { NextResponse } from 'next/server';
import { handleFinanceGovernanceApiError } from '../../../../../lib/finance-governance/api-error';
import { FinanceGovernanceRepository } from '../../../../../lib/finance-governance/repository';
import { getOrg } from '../../../../../lib/server/getOrg';

export const dynamic = 'force-dynamic';

const repository = new FinanceGovernanceRepository();

export async function GET(_request: Request) {
  try {
    const orgId = await getOrg();
    const workspace = await repository.getWorkspaceSummary(orgId);
    return NextResponse.json({ workspace });
  } catch (error) {
    return handleFinanceGovernanceApiError('api/finance-governance', error);
  }
}
