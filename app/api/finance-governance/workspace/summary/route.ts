import { NextResponse } from 'next/server';
import { resolveOrgId } from '../../../../../lib/finance-governance/org-scope';
import { FinanceGovernanceRepository } from '../../../../../lib/finance-governance/repository';

export const dynamic = 'force-dynamic';

const repository = new FinanceGovernanceRepository();

export async function GET(request: Request) {
  try {
    const orgId = resolveOrgId(request);
    const workspace = await repository.getWorkspaceSummary(orgId);
    return NextResponse.json({ workspace });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    const status = message === 'missing_org_id' ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
