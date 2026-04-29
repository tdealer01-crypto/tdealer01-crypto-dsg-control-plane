import { NextResponse } from 'next/server';
import { handleFinanceGovernanceApiError } from '../../../../../../lib/finance-governance/api-error';
import { FinanceGovernanceAuditLedgerRepository } from '../../../../../../lib/finance-governance/audit-ledger-repository';
import { resolveOrgId } from '../../../../../../lib/finance-governance/org-scope';

export const dynamic = 'force-dynamic';

const repository = new FinanceGovernanceAuditLedgerRepository();

type RouteContext = { params: Promise<{ recordHash: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const orgId = resolveOrgId(request);
    const { recordHash } = await context.params;
    const result = await repository.verify(orgId, recordHash);

    return NextResponse.json({ ok: result.verification.ok, ...result });
  } catch (error) {
    return handleFinanceGovernanceApiError('api/finance-governance/audit-ledger/verify', error);
  }
}
