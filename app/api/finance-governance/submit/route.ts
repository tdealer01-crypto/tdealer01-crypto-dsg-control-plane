import { NextResponse } from 'next/server';
import { handleFinanceGovernanceApiError } from '../../../../lib/finance-governance/api-error';
import { FinanceGovernanceRepository } from '../../../../lib/finance-governance/repository';
import { resolveOrgId } from '../../../../lib/finance-governance/org-scope';

export const dynamic = 'force-dynamic';

const repository = new FinanceGovernanceRepository();

export async function POST(request: Request) {
  try {
    const orgId = resolveOrgId(request);
    const body = await request.json().catch(() => null);
    const caseId = typeof body?.caseId === 'string' && body.caseId.trim().length > 0 ? body.caseId.trim() : 'sample-case';
    const result = await repository.submit(orgId, caseId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleFinanceGovernanceApiError('api/finance-governance', error);
  }
}
