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
  chain.eq = vi.fn().mockResolvedValue(result);
  return chain;
}

describe('gateway monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHashGatewayValue.mockReturnValue('hash-123');
    mockBuildGatewayAuditProof.mockReturnValue({ committed: true, recordHash: 'record-hash' });
    mockEvaluateGatewayToolRequest.mockReturnValue({ decision: 'allow', reason: 'ok', risk: 'low' });
  });

  describe('createMonitorPlanCheck', () => {
    it('returns error when insert fails', async () => {
      mockFrom.mockReturnValue(makeInsertChain({ data: null, error: { message: 'insert failed' } }));

      const result = await createMonitorPlanCheck(baseRequest);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('insert failed');
    });

    it('returns error when insert succeeds without id', async () => {
      mockFrom.mockReturnValue(makeInsertChain({ data: {}, error: null }));

      const result = await createMonitorPlanCheck(baseRequest);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('missing monitor event id');
    });

    it('returns allow decision with audit token', async () => {
      mockFrom.mockReturnValue(makeInsertChain({ data: { id: 'evt-1' }, error: null }));

      const result = await createMonitorPlanCheck(baseRequest);

      expect(result.ok).toBe(true);
      expect(result.decision).toBe('allow');
      expect(result.auditToken).toBe('monitor:evt-1:record-hash');
    });

    it('returns block decision', async () => {
      mockEvaluateGatewayToolRequest.mockReturnValue({ decision: 'block', reason: 'blocked', risk: 'high' });
      mockFrom.mockReturnValue(makeInsertChain({ data: { id: 'evt-2' }, error: null }));

      const result = await createMonitorPlanCheck(baseRequest);

      expect(result.ok).toBe(true);
      expect(result.decision).toBe('block');
      expect(result.reason).toBe('blocked');
    });

    it('hashes request and decision payloads', async () => {
      mockFrom.mockReturnValue(makeInsertChain({ data: { id: 'evt-3' }, error: null }));

      await createMonitorPlanCheck(baseRequest);

      expect(mockHashGatewayValue).toHaveBeenCalledWith(expect.objectContaining({ orgId: 'org-1' }));
      expect(mockHashGatewayValue).toHaveBeenCalledWith(expect.objectContaining({ decision: 'allow' }));
    });

    it('stores monitor constraints in insert payload', async () => {
      const chain = makeInsertChain({ data: { id: 'evt-4' }, error: null });
      mockFrom.mockReturnValue(chain);

      await createMonitorPlanCheck(baseRequest);

      expect(chain.insert as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(expect.objectContaining({
        org_id: 'org-1',
        tool_name: 'slack.send',
        action: 'send_message',
      }));
    });
  });

  describe('commitMonitorAudit', () => {
    it('rejects missing orgId', async () => {
      const result = await commitMonitorAudit('', 'monitor:evt:hash');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('missing orgId');
    });

    it('rejects malformed token', async () => {
      const result = await commitMonitorAudit('org-1', 'bad-token');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('invalid audit token');
    });

    it('returns read error', async () => {
      mockFrom.mockReturnValue(makeReadChain({ data: null, error: { message: 'read failed' } }));

      const result = await commitMonitorAudit('org-1', 'monitor:evt-1:hash');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('read failed');
    });

    it('returns not found', async () => {
      mockFrom.mockReturnValue(makeReadChain({ data: null, error: null }));

      const result = await commitMonitorAudit('org-1', 'monitor:evt-1:hash');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('monitor event not found');
    });

    it('rejects non-allow decision', async () => {
      mockFrom.mockReturnValue(makeReadChain({ data: { id: 'evt-1', decision: 'block' }, error: null }));

      const result = await commitMonitorAudit('org-1', 'monitor:evt-1:hash');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('monitor decision is not allow');
    });

    it('returns update error', async () => {
      mockFrom
        .mockReturnValueOnce(makeReadChain({ data: { id: 'evt-1', decision: 'allow' }, error: null }))
        .mockReturnValueOnce(makeUpdateChain({ error: { message: 'update failed' } }));

      const result = await commitMonitorAudit('org-1', 'monitor:evt-1:hash');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('update failed');
    });

    it('commits audit successfully', async () => {
      mockFrom
        .mockReturnValueOnce(makeReadChain({ data: { id: 'evt-1', decision: 'allow' }, error: null }))
        .mockReturnValueOnce(makeUpdateChain({ error: null }));

      const result = await commitMonitorAudit('org-1', 'monitor:evt-1:hash');

      expect(result.ok).toBe(true);
      expect(result.eventId).toBe('evt-1');
    });
  });
});
