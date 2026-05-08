export { decideGatewayApproval as decideGatewayApprovalHardened } from './approvals';

export type HardenedApprovalDecisionInput = {
  auditToken: string;
  decision: 'approved' | 'rejected';
  note?: string;
};

export type HardenedApprovalDecisionResult = {
  ok: boolean;
  approvalToken?: string;
  approvalHash?: string;
  eventRecorded?: boolean;
  error?: string;
};
