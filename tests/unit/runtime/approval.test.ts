import { buildApprovalKey, isReusableApprovalStatus } from '../../../lib/runtime/approval';

describe('runtime approval', () => {
  it('builds deterministic approval key', () => {
    const keyA = buildApprovalKey({ orgId: 'o1', agentId: 'a1', request: { b: 2, a: 1 } });
    const keyB = buildApprovalKey({ orgId: 'o1', agentId: 'a1', request: { a: 1, b: 2 } });
    expect(keyA).toBe(keyB);
  });

  it('only pending status is reusable', () => {
    expect(isReusableApprovalStatus('pending')).toBe(true);
    expect(isReusableApprovalStatus('consumed')).toBe(false);
    expect(isReusableApprovalStatus('expired')).toBe(false);
  });
});
