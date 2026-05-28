import { NextResponse } from 'next/server';
import { handleFinanceGovernanceApiError } from '../../../../lib/finance-governance/api-error';
import { requireFinanceGovernanceAccess } from '../../../../lib/finance-governance/access-gate';
import { resolveOrgId } from '../../../../lib/finance-governance/org-scope';
import { FinanceGovernanceRepository } from '../../../../lib/finance-governance/repository';
import { readJsonBody } from '../../../../lib/security/request-json';

export const dynamic = 'force-dynamic';

const repository = new FinanceGovernanceRepository();

export async function POST(request: Request) {
  try {
    const orgId = resolveOrgId(request);
    requireFinanceGovernanceAccess(request, orgId, 'submit');
    const parsed = await readJsonBody<{ caseId?: unknown }>(request, { maxBytes: 4_096 });
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const caseId = typeof parsed.value?.caseId === 'string' && parsed.value.caseId.trim().length > 0 ? parsed.value.caseId.trim() : '';

    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 });
    }

    const result = await repository.submit(orgId, caseId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleFinanceGovernanceApiError('api/finance-governance', error);
  }
}
