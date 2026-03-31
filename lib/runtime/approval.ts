import { canonicalHash, type CanonicalInput } from './canonical';

export type RuntimeApprovalStatus =
  | 'pending'
  | 'consumed'
  | 'revoked'
  | 'expired'
  | 'rejected';

export function buildApprovalKey(input: {
  orgId: string;
  agentId: string;
  request: CanonicalInput;
}): string {
  return canonicalHash({
    org_id: input.orgId,
    agent_id: input.agentId,
    request: input.request,
  });
}

export function isReusableApprovalStatus(status: RuntimeApprovalStatus): boolean {
  return status === 'pending';
}
