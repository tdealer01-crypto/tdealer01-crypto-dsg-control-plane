import { NextResponse } from 'next/server';
import { handleFinanceGovernanceApiError } from '../../../../lib/finance-governance/api-error';
import { notifyApprovalStatusChange } from '../../../../lib/finance-governance/notify';
import { FinanceGovernanceRepository } from '../../../../lib/finance-governance/repository';
import { getOrg } from '../../../../lib/server/getOrg';

export const dynamic = 'force-dynamic';

const repository = new FinanceGovernanceRepository();

export async function GET(_request: Request) {
  try {
    const orgId = await getOrg();
    const approvals = await repository.getApprovals(orgId);
    return NextResponse.json({ approvals });
  } catch (error) {
    return handleFinanceGovernanceApiError('api/finance-governance', error);
  }
}

const ALLOWED_ACTIONS = new Set(['approve', 'reject', 'escalate'] as const);
type AllowedAction = 'approve' | 'reject' | 'escalate';

export async function POST(request: Request) {
  try {
    const orgId = await getOrg();
    const body = await request.json().catch(() => null);
    const approvalId = typeof body?.approvalId === 'string' ? body.approvalId.trim() : '';
    const action = typeof body?.action === 'string' ? body.action.trim() : '';

    if (!approvalId) {
      return NextResponse.json({ error: 'approvalId is required' }, { status: 400 });
    }
    if (!ALLOWED_ACTIONS.has(action as AllowedAction)) {
      return NextResponse.json({ error: 'action must be approve, reject, or escalate' }, { status: 400 });
    }

    const result = await repository.applyAction(orgId, approvalId, action as AllowedAction);
    void notifyApprovalStatusChange({
      approvalId,
      vendor: approvalId,
      action: action as AllowedAction,
      orgId,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleFinanceGovernanceApiError('api/finance-governance', error);
  }
}
