import { NextResponse } from 'next/server';
import { resolveOrgId } from '../../../../../../lib/finance-governance/org-scope';
import { FinanceGovernanceRepository } from '../../../../../../lib/finance-governance/repository';

const repository = new FinanceGovernanceRepository();

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const orgId = resolveOrgId(request);
    const { id } = await context.params;
    const exceptions = await repository.getExceptions(orgId, id);
    return NextResponse.json({ exceptions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
