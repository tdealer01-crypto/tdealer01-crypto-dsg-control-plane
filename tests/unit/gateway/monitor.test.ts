import { describe, expect, it, vi, beforeEach } from 'vitest';

const {
  mockFrom,
  mockFindGatewayTool,
  mockEvaluateGatewayToolRequest,
  mockBuildGatewayAuditProof,
  mockHashGatewayValue,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockFindGatewayTool: vi.fn(),
  mockEvaluateGatewayToolRequest: vi.fn(),
  mockBuildGatewayAuditProof: vi.fn(),
  mockHashGatewayValue: vi.fn(),
}));

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

vi.mock('../../../lib/gateway/tool-registry', () => ({
  findGatewayTool: mockFindGatewayTool,
}));

vi.mock('../../../lib/gateway/policy', () => ({
  evaluateGatewayToolRequest: mockEvaluateGatewayToolRequest,
}));

vi.mock('../../../lib/gateway/audit', () => ({
  buildGatewayAuditProof: mockBuildGatewayAuditProof,
  hashGatewayValue: mockHashGatewayValue,
}));

import { createMonitorPlanCheck, commitMonitorAudit } from '../../../lib/gateway/monitor';
import type { GatewayToolRequest } from '../../../lib/gateway/types';

const baseRequest: GatewayToolRequest = {
  orgId: 'org-1',
  actorId: 'actor-1',
  actorRole: 'admin',
  orgPlan: 'enterprise',
  toolName: 'slack.send',
  action: 'send_message',
  input: { text: 'hello' },
};

function makeInsertChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(result);
  return chain;
}

function makeReadChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  return chain;
}

function makeUpdateChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  // vitest resolves the final `.eq()` call as a Promise
  chain.eq = vi.fn().mockResolvedValue(result);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFindGatewayTool.mockResolvedValue(null);
  mockEvaluateGatewayToolRequest.mockReturnValue({ decision: 'allow', reason: null });
  mockBuildGatewayAuditProof.mockReturnValue({ requestHash: 'req-hash-123', recordHash: 'rec-hash-123' });
  mockHashGatewayValue.mockReturnValue('decision-hash-abc');
});

// ─── createMonitorPlanCheck ──────────────────────────────────────────────────

describe('createMonitorPlanCheck', () => {
  it('throws when DB insert fails', async () => {
    mockFrom.mockReturnValue(makeInsertChain({ data: null, error: { message: 'insert error' } }));

    await expect(createMonitorPlanCheck(baseRequest)).rejects.toThrow('failed_to_record_monitor_event:insert error');
  });

  it('throws when insert returns no event id', async () => {
    mockFrom.mockReturnValue(makeInsertChain({ data: {}, error: null }));

    await expect(createMonitorPlanCheck(baseRequest)).rejects.toThrow('failed_to_record_monitor_event:no_inserted_event');
  });

  it('returns ok:true when decision is allow', async () => {
    mockFrom.mockReturnValue(makeInsertChain({ data: { id: 'ev-1', audit_token: 'gat_abc' }, error: null }));

    const result = await createMonitorPlanCheck(baseRequest);
    expect(result.ok).toBe(true);
    expect(result.decision).toBe('allow');
    expect(result.mode).toBe('monitor');
  });

  it('returns ok:false when decision is block', async () => {
    mockEvaluateGatewayToolRequest.mockReturnValue({ decision: 'block', reason: 'tool not registered' });
    mockFrom.mockReturnValue(makeInsertChain({ data: { id: 'ev-2', audit_token: 'gat_def' }, error: null }));

    const result = await createMonitorPlanCheck(baseRequest);
    expect(result.ok).toBe(false);
    expect(result.decision).toBe('block');
    expect(result.reason).toBe('tool not registered');
  });

  it('auditToken starts with gat_', async () => {
    mockFrom.mockReturnValue(makeInsertChain({ data: { id: 'ev-3', audit_token: 'gat_xyz' }, error: null }));

    const result = await createMonitorPlanCheck(baseRequest);
    expect(result.auditToken).toMatch(/^gat_/);
  });

  it('includes requestHash and decisionHash in result', async () => {
    mockFrom.mockReturnValue(makeInsertChain({ data: { id: 'ev-4', audit_token: 'gat_123' }, error: null }));

    const result = await createMonitorPlanCheck(baseRequest);
    expect(result.requestHash).toBe('req-hash-123');
    expect(result.decisionHash).toBe('decision-hash-abc');
  });

  it('passes constraints with 300s expiry to insert', async () => {
    const insertChain = makeInsertChain({ data: { id: 'ev-5', audit_token: 'gat_abc' }, error: null });
    mockFrom.mockReturnValue(insertChain);

    await createMonitorPlanCheck(baseRequest);

    const insertCall = (insertChain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(insertCall.constraints.expiresInSeconds).toBe(300);
    expect(insertCall.constraints.allowedTool).toBe('slack.send');
  });
});

// ─── commitMonitorAudit ──────────────────────────────────────────────────────

describe('commitMonitorAudit', () => {
  it('returns ok:false + missing_org_id when orgId is empty', async () => {
    const result = await commitMonitorAudit('', 'tok-abc', {});
    expect(result.ok).toBe(false);
    expect(result.error).toBe('missing_org_id');
  });

  it('returns ok:false + missing_audit_token when auditToken is empty', async () => {
    const result = await commitMonitorAudit('org-1', '', {});
    expect(result.ok).toBe(false);
    expect(result.error).toBe('missing_audit_token');
  });

  it('throws when DB read fails', async () => {
    mockFrom.mockReturnValue(makeReadChain({ data: null, error: { message: 'db timeout' } }));

    await expect(commitMonitorAudit('org-1', 'tok-abc', {})).rejects.toThrow('failed_to_read_monitor_event:db timeout');
  });

  it('returns ok:false + audit_token_not_found when event not found', async () => {
    mockFrom.mockReturnValue(makeReadChain({ data: null, error: null }));

    const result = await commitMonitorAudit('org-1', 'tok-abc', {});
    expect(result.ok).toBe(false);
    expect(result.error).toBe('audit_token_not_found');
  });

  it('returns ok:false + decision_not_allowed when event decision is not allow', async () => {
    mockFrom.mockReturnValue(makeReadChain({
      data: { id: 'ev-1', org_id: 'org-1', request_hash: 'rh-1', decision: 'block', status: 'rejected' },
      error: null,
    }));

    const result = await commitMonitorAudit('org-1', 'tok-abc', {});
    expect(result.ok).toBe(false);
    expect(result.error).toBe('decision_not_allowed');
  });

  it('throws when update fails', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeReadChain({
          data: { id: 'ev-1', org_id: 'org-1', request_hash: 'rh-1', decision: 'allow', status: 'recorded' },
          error: null,
        });
      }
      const chain: Record<string, unknown> = {};
      chain.update = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockResolvedValue({ error: { message: 'update failed' } });
      return chain;
    });

    await expect(commitMonitorAudit('org-1', 'tok-abc', {})).rejects.toThrow('failed_to_commit_monitor_event:update failed');
  });

  it('returns ok:true with committed:true and recordHash on success', async () => {
    mockHashGatewayValue.mockReturnValue('committed-record-hash');
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeReadChain({
          data: { id: 'ev-1', org_id: 'org-1', request_hash: 'rh-1', decision: 'allow', status: 'recorded' },
          error: null,
        });
      }
      const chain: Record<string, unknown> = {};
      chain.update = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockResolvedValue({ error: null });
      return chain;
    });

    const result = await commitMonitorAudit('org-1', 'tok-abc', { executionResult: 'done' });
    expect(result.ok).toBe(true);
    expect(result.committed).toBe(true);
    expect(result.recordHash).toBe('committed-record-hash');
  });
});
