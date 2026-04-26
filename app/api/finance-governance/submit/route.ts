import { NextResponse } from 'next/server';
import { handleFinanceGovernanceApiError } from '../../../../lib/finance-governance/api-error';
import { FinanceGovernanceRepository } from '../../../../lib/finance-governance/repository';
import { getOrg } from '../../../../lib/server/getOrg';

export const dynamic = 'force-dynamic';

const repository = new FinanceGovernanceRepository();

export async function POST(request: Request) {
  try {
    const orgId = await getOrg();
    const body = await request.json().catch(() => null);
    const caseId = typeof body?.caseId === 'string' && body.caseId.trim().length > 0 ? body.caseId.trim() : '';

    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 });
    }

    const result = await repository.submit(orgId, caseId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleFinanceGovernanceApiError('api/finance-governance', error);
  }
}
