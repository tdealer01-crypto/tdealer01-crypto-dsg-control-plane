import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockRecordGovernanceDecisionEvent } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRecordGovernanceDecisionEvent: vi.fn(),
}));

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

vi.mock('@/lib/governance/decision-recorder', () => ({
  recordGovernanceDecisionEvent: mockRecordGovernanceDecisionEvent,
}));

import {
  buildApprovalToken,
  buildApprovalHash,
  listPendingGatewayApprovals,
  decideGatewayApproval,
} from '../../../lib/gateway/approvals';

function makeReadChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  return chain;
}

function makeUpdateChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  return Object.assign(chain, { then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRecordGovernanceDecisionEvent.mockResolvedValue(true);
});

// ─── buildApprovalToken ──────────────────────────────────────────────────

describe('buildApprovalToken', () => {
  it('starts with gap_ prefix', () => {
    expect(buildApprovalToken()).toMatch(/^gap_/);
  });

  it('contains only hex chars after the prefix', () => {
    const token = buildApprovalToken();
    expect(token.slice(4)).toMatch(/^[0-9a-f]+$/);
  });

  it('is 52 characters long (gap_ + 48 hex chars from 24 bytes)', () => {
    expect(buildApprovalToken()).toHaveLength(52);
  });

  it('generates a different token on each call', () => {
    expect(buildApprovalToken()).not.toBe(buildApprovalToken());
  });
});

// ─── buildApprovalHash ───────────────────────────────────────────────────

describe('buildApprovalHash', () => {
  it('returns a 64-char hex string (SHA-256)', () => {
    expect(buildApprovalHash({ x: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for identical inputs', () => {
    const h1 = buildApprovalHash({ orgId: 'org-1', decision: 'approved' });
    const h2 = buildApprovalHash({ orgId: 'org-1', decision: 'approved' });
    expect(h1).toBe(h2);
  });

  it('differs when input changes', () => {
    const h1 = buildApprovalHash({ decision: 'approved' });
    const h2 = buildApprovalHash({ decision: 'rejected' });
    expect(h1).not.toBe(h2);
  });
});

// ─── listPendingGatewayApprovals ─────────────────────────────────────────

describe('listPendingGatewayApprovals', () => {
  it('returns ok:false and missing_org_id when orgId is empty', async () => {
    const result = await listPendingGatewayApprovals('');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('missing_org_id');
    expect(result.approvals).toEqual([]);
  });

  it('returns ok:false on DB error', async () => {
    const chain = makeReadChain({ data: null, error: { message: 'connection refused' } });
    mockFrom.mockReturnValue(chain);

    const result = await listPendingGatewayApprovals('org-1');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('connection refused');
    expect(result.approvals).toEqual([]);
  });

  it('returns ok:true and approvals array on success', async () => {
    const approvals = [{ id: 'ev-1', decision: 'review' }];
    const chain = makeReadChain({ data: approvals, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await listPendingGatewayApprovals('org-1');
    expect(result.ok).toBe(true);
    expect(result.approvals).toEqual(approvals);
  });

  it('returns empty array when data is null', async () => {
    const chain = makeReadChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await listPendingGatewayApprovals('org-1');
    expect(result.ok).toBe(true);
    expect(result.approvals).toEqual([]);
  });
});

// ─── decideGatewayApproval — validation ──────────────────────────────────

describe('decideGatewayApproval — input validation', () => {
  const base = {
    orgId: 'org-1',
    auditToken: 'tok-abc',
    decision: 'approved' as const,
    reviewerId: 'user-1',
    reviewerRole: 'finance_approver',
  };

  it('returns ok:false + missing_org_id when orgId is empty', async () => {
    const result = await decideGatewayApproval({ ...base, orgId: '' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('missing_org_id');
  });

  it('returns ok:false + missing_audit_token when auditToken is empty', async () => {
    const result = await decideGatewayApproval({ ...base, auditToken: '' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('missing_audit_token');
  });

  it('returns ok:false + missing_reviewer_id when reviewerId is empty', async () => {
    const result = await decideGatewayApproval({ ...base, reviewerId: '' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('missing_reviewer_id');
  });

  it('returns ok:false + missing_reviewer_role when reviewerRole is empty', async () => {
    const result = await decideGatewayApproval({ ...base, reviewerRole: '' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('missing_reviewer_role');
  });
});

// ─── decideGatewayApproval — DB read failures ─────────────────────────────

describe('decideGatewayApproval — DB read', () => {
  const base = {
    orgId: 'org-1',
    auditToken: 'tok-abc',
    decision: 'approved' as const,
    reviewerId: 'user-1',
    reviewerRole: 'finance_approver',
  };

  it('throws when DB read fails', async () => {
    const chain = makeReadChain({ data: null, error: { message: 'db timeout' } });
    mockFrom.mockReturnValue(chain);

    await expect(decideGatewayApproval(base)).rejects.toThrow('failed_to_read_approval_event:db timeout');
  });

  it('returns ok:false + audit_token_not_found when event not found', async () => {
    const chain = makeReadChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await decideGatewayApproval(base);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('audit_token_not_found');
  });

  it('returns ok:false + event_not_waiting_for_review when event decision is not review', async () => {
    const chain = makeReadChain({
      data: { id: 'ev-1', org_id: 'org-1', audit_token: 'tok-abc', decision: 'allow', request_hash: 'abc', constraints: null, input: null },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const result = await decideGatewayApproval(base);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('event_not_waiting_for_review');
  });
});

// ─── decideGatewayApproval — success paths ───────────────────────────────

describe('decideGatewayApproval — approved', () => {
  const base = {
    orgId: 'org-1',
    auditToken: 'tok-abc',
    decision: 'approved' as const,
    reviewerId: 'user-1',
    reviewerRole: 'finance_approver',
    note: 'LGTM',
  };

  const pendingEvent = {
    id: 'ev-1',
    org_id: 'org-1',
    audit_token: 'tok-abc',
    decision: 'review',
    request_hash: 'req-hash-abc',
    constraints: null,
    input: null,
  };

  function setupMocks() {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeReadChain({ data: pendingEvent, error: null });
      }
      const updateChain: Record<string, unknown> = {};
      updateChain.update = vi.fn().mockReturnValue(updateChain);
      updateChain.eq = vi.fn().mockReturnValue(updateChain);
      (updateChain as unknown as Promise<unknown>) as unknown;
      return Object.assign(updateChain, {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });
    });
  }

  it('returns ok:true', async () => {
    setupMocks();
    const result = await decideGatewayApproval(base);
    expect(result.ok).toBe(true);
  });

  it('returns an approvalToken starting with gap_', async () => {
    setupMocks();
    const result = await decideGatewayApproval(base);
    expect(result.approvalToken).toMatch(/^gap_/);
  });

  it('returns approvalHash as 64-char hex', async () => {
    setupMocks();
    const result = await decideGatewayApproval(base);
    expect(result.approvalHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('calls recordGovernanceDecisionEvent with decision PASS', async () => {
    setupMocks();
    await decideGatewayApproval(base);
    expect(mockRecordGovernanceDecisionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'PASS', action: 'approve' })
    );
  });
});

describe('decideGatewayApproval — rejected', () => {
  const base = {
    orgId: 'org-1',
    auditToken: 'tok-abc',
    decision: 'rejected' as const,
    reviewerId: 'user-1',
    reviewerRole: 'finance_approver',
  };

  const pendingEvent = {
    id: 'ev-1',
    org_id: 'org-1',
    audit_token: 'tok-abc',
    decision: 'review',
    request_hash: 'req-hash-abc',
    constraints: null,
    input: null,
  };

  function setupMocks() {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeReadChain({ data: pendingEvent, error: null });
      }
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
    });
  }

  it('returns ok:true', async () => {
    setupMocks();
    const result = await decideGatewayApproval(base);
    expect(result.ok).toBe(true);
  });

  it('does NOT return an approvalToken for rejection', async () => {
    setupMocks();
    const result = await decideGatewayApproval(base);
    expect(result.approvalToken).toBeUndefined();
  });

  it('calls recordGovernanceDecisionEvent with decision BLOCK', async () => {
    setupMocks();
    await decideGatewayApproval(base);
    expect(mockRecordGovernanceDecisionEvent).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'BLOCK', action: 'reject' })
    );
  });
});

describe('decideGatewayApproval — governance event failure', () => {
  it('returns ok:false when governance event recording returns false', async () => {
    mockRecordGovernanceDecisionEvent.mockResolvedValue(false);
    const pendingEvent = {
      id: 'ev-1', org_id: 'org-1', audit_token: 'tok-abc', decision: 'review',
      request_hash: 'abc', constraints: null, input: null,
    };
    mockFrom.mockReturnValue(makeReadChain({ data: pendingEvent, error: null }));

    const result = await decideGatewayApproval({
      orgId: 'org-1', auditToken: 'tok-abc', decision: 'approved',
      reviewerId: 'user-1', reviewerRole: 'finance_approver',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('failed_to_record_governance_decision_event');
  });
});
