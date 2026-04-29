import { NextResponse } from 'next/server';
import { handleFinanceGovernanceApiError } from '../../../../lib/finance-governance/api-error';
import { FinanceGovernanceAuditLedgerRepository } from '../../../../lib/finance-governance/audit-ledger-repository';
import { resolveOrgId } from '../../../../lib/finance-governance/org-scope';

export const dynamic = 'force-dynamic';

const repository = new FinanceGovernanceAuditLedgerRepository();

export async function GET(request: Request) {
  try {
    const orgId = resolveOrgId(request);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? 50);
    const records = await repository.list(orgId, limit);

    return NextResponse.json({ ok: true, records });
  } catch (error) {
    return handleFinanceGovernanceApiError('api/finance-governance/audit-ledger', error);
  }
}
