import { NextResponse } from 'next/server';
import { FinanceGovernanceRepository } from '../../../../../../lib/finance-governance/repository';
import { resolveOrgId } from '../../../../../../lib/finance-governance/org-scope';

export const dynamic = 'force-dynamic';

const repository = new FinanceGovernanceRepository();

type RouteContext = { params: { id: string } };

export async function POST(request: Request, context: RouteContext) {
  try {
    const orgId = resolveOrgId(request);
    const result = await repository.applyAction(orgId, context.params.id, 'reject');
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    const status = message === 'missing_org_id' ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
