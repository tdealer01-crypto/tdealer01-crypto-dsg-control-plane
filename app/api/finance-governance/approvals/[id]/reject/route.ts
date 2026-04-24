import { NextResponse } from 'next/server';
import { handleFinanceGovernanceApiError } from '../../../../../../lib/finance-governance/api-error';
import { FinanceGovernanceRepository } from '../../../../../../lib/finance-governance/repository';
import { resolveOrgId } from '../../../../../../lib/finance-governance/org-scope';

export const dynamic = 'force-dynamic';

const repository = new FinanceGovernanceRepository();

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const orgId = resolveOrgId(request);
    const { id } = await context.params;
    const result = await repository.applyAction(orgId, id, 'reject');
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleFinanceGovernanceApiError('api/finance-governance', error);
  }
}
