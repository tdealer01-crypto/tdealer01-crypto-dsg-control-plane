import { NextResponse } from 'next/server';
import { handleFinanceGovernanceApiError } from '../../../../lib/finance-governance/api-error';
import { requireFinanceGovernanceAccess } from '../../../../lib/finance-governance/access-gate';
import { resolveOrgId } from '../../../../lib/finance-governance/org-scope';
import { FinanceGovernanceRepository } from '../../../../lib/finance-governance/repository';

export const dynamic = 'force-dynamic';

const repository = new FinanceGovernanceRepository();

export async function POST(request: Request) {
  try {
    const orgId = resolveOrgId(request);
    requireFinanceGovernanceAccess(request, orgId, 'submit');
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
