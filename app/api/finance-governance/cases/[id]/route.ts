import { NextResponse } from 'next/server';
import { resolveOrgId } from '../../../../../lib/finance-governance/org-scope';
import { FinanceGovernanceRepository } from '../../../../../lib/finance-governance/repository';

export const dynamic = 'force-dynamic';

const repository = new FinanceGovernanceRepository();

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const orgId = resolveOrgId(request);
    const { id } = await context.params;
    const detail = await repository.getCaseDetail(orgId, id);
    return NextResponse.json({ case: detail });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    const status = message === 'missing_org_id' ? 400 : message === 'case_not_found' ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
