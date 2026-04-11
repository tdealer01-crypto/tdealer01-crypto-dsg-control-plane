export type FinanceGovernanceActionName = 'submit' | 'approve' | 'reject' | 'escalate';

export type FinanceGovernanceActionResult = {
  ok: true;
  action: FinanceGovernanceActionName;
  message: string;
  nextStatus: string;
  caseId?: string;
  approvalId?: string;
};

export function buildSubmitResult(caseId: string): FinanceGovernanceActionResult {
  return {
    ok: true,
    action: 'submit',
    message: 'Finance workflow item submitted',
    nextStatus: 'pending',
    caseId,
  };
}

export function buildApprovalActionResult(
  action: Extract<FinanceGovernanceActionName, 'approve' | 'reject' | 'escalate'>,
  approvalId: string
): FinanceGovernanceActionResult {
  const nextStatusMap = {
    approve: 'approved',
    reject: 'rejected',
    escalate: 'escalated',
  } as const;

  const messageMap = {
    approve: 'Approval marked as approved',
    reject: 'Approval marked as rejected',
    escalate: 'Approval escalated for further review',
  } as const;

  return {
    ok: true,
    action,
    message: messageMap[action],
    nextStatus: nextStatusMap[action],
    approvalId,
  };
}
