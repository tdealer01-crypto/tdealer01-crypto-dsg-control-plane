import { NextResponse } from 'next/server';
import { handleFinanceGovernanceApiError } from '../../../../../../lib/finance-governance/api-error';
import { resolveOrgId } from '../../../../../../lib/finance-governance/org-scope';
import { FinanceGovernanceRepository } from '../../../../../../lib/finance-governance/repository';

const repository = new FinanceGovernanceRepository();

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const orgId = resolveOrgId(request);
    const { id } = await context.params;
    const decisions = await repository.getDecisions(orgId, id);
    return NextResponse.json({ decisions });
  } catch (error) {
    return handleFinanceGovernanceApiError('api/finance-governance', error);
  }
}
