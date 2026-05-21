import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../lib/gateway/tool-registry', () => ({
  findGatewayTool: vi.fn(),
}));
vi.mock('../../../lib/gateway/providers', () => ({
  executeGatewayProvider: vi.fn(),
}));
vi.mock('../../../lib/gateway/audit', () => ({
  buildGatewayAuditProof: vi.fn(() => ({
    auditId: 'audit-1',
    orgId: 'org-1',
    decision: 'allow',
    timestamp: new Date().toISOString(),
  })),
}));

import { executeGatewayTool, normalizeGatewayToolRequest } from '../../../lib/gateway/executor';
import { findGatewayTool } from '../../../lib/gateway/tool-registry';
import { executeGatewayProvider } from '../../../lib/gateway/providers';

const mockFindTool = vi.mocked(findGatewayTool);
const mockExecuteProvider = vi.mocked(executeGatewayProvider);

const validTool = {
  name: 'zapier.slack.post_message',
  provider: 'zapier',
  action: 'post_message',
  risk: 'medium' as const,
  executionMode: 'sync' as const,
  requiresApproval: false,
  description: 'Post a Slack message',
};

const validRequest = {
  orgId: 'org-1',
  actorId: 'user-1',
  actorRole: 'owner',
  orgPlan: 'pro',
  toolName: 'zapier.slack.post_message',
  action: 'post_message',
  input: { channel: '#general', text: 'hello' },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('normalizeGatewayToolRequest', () => {
  it('reads fields from body', () => {
    const headers = new Headers();
    const req = normalizeGatewayToolRequest(
      { orgId: 'org-1', actorId: 'u-1', actorRole: 'owner', orgPlan: 'pro', toolName: 'tool', action: 'run', input: {} },
      headers
    );
    expect(req.orgId).toBe('org-1');
    expect(req.actorId).toBe('u-1');
  });

  it('falls back to headers when body fields are empty', () => {
    const headers = new Headers({
      'x-org-id': 'org-2',
      'x-actor-id': 'u-2',
      'x-actor-role': 'admin',
      'x-org-plan': 'business',
    });
    const req = normalizeGatewayToolRequest({ toolName: 'tool', action: 'run', input: {} }, headers);
    expect(req.orgId).toBe('org-2');
    expect(req.actorId).toBe('u-2');
    expect(req.actorRole).toBe('admin');
    expect(req.orgPlan).toBe('business');
  });

  it('reads approvalToken from x-approval-token header', () => {
    const headers = new Headers({ 'x-approval-token': 'tok-xyz' });
    const req = normalizeGatewayToolRequest(
      { orgId: 'o', actorId: 'a', actorRole: 'owner', orgPlan: 'pro', toolName: 't', action: 'a', input: {} },
      headers
    );
    expect(req.approvalToken).toBe('tok-xyz');
  });

  it('sanitizes non-object input to empty object', () => {
    const headers = new Headers();
    const req = normalizeGatewayToolRequest(
      { orgId: 'o', actorId: 'a', actorRole: 'owner', orgPlan: 'pro', toolName: 't', action: 'a', input: 'bad_string' },
      headers
    );
    expect(req.input).toEqual({});
  });

  it('sanitizes array input to empty object', () => {
    const headers = new Headers();
    const req = normalizeGatewayToolRequest(
      { orgId: 'o', actorId: 'a', actorRole: 'owner', orgPlan: 'pro', toolName: 't', action: 'a', input: [1, 2, 3] },
      headers
    );
    expect(req.input).toEqual({});
  });
});

describe('executeGatewayTool', () => {
  it('returns block when tool is not found in registry', async () => {
    mockFindTool.mockResolvedValue(null);
    const result = await executeGatewayTool(validRequest);
    expect(result.ok).toBe(false);
    expect(result.decision).toBe('block');
    expect(result.reason).toBe('tool_not_registered');
  });

  it('returns review when approval required and no token', async () => {
    mockFindTool.mockResolvedValue({ ...validTool, requiresApproval: true });
    const result = await executeGatewayTool(validRequest);
    expect(result.ok).toBe(false);
    expect(result.decision).toBe('review');
    expect(result.reason).toBe('approval_required');
  });

  it('calls provider and returns ok=true when policy allows', async () => {
    mockFindTool.mockResolvedValue(validTool);
    mockExecuteProvider.mockResolvedValue({
      ok: true,
      provider: 'zapier',
      toolName: 'zapier.slack.post_message',
      action: 'post_message',
      target: 'zapier.slack.post_message',
      output: { messageId: 'msg-1' },
    });

    const result = await executeGatewayTool(validRequest);
    expect(result.ok).toBe(true);
    expect(result.decision).toBe('allow');
    expect(mockExecuteProvider).toHaveBeenCalledOnce();
  });

  it('returns block with error message when provider throws', async () => {
    mockFindTool.mockResolvedValue(validTool);
    mockExecuteProvider.mockRejectedValue(new Error('network_error'));

    const result = await executeGatewayTool(validRequest);
    expect(result.ok).toBe(false);
    expect(result.decision).toBe('block');
    expect(result.reason).toBe('network_error');
  });

  it('returns block when provider returns ok=false', async () => {
    mockFindTool.mockResolvedValue(validTool);
    mockExecuteProvider.mockResolvedValue({
      ok: false,
      provider: 'zapier',
      toolName: 'zapier.slack.post_message',
      action: 'post_message',
      target: 'zapier.slack.post_message',
      error: 'rate_limited',
    });

    const result = await executeGatewayTool(validRequest);
    expect(result.ok).toBe(false);
    expect(result.decision).toBe('block');
  });

  it('includes audit proof in every result', async () => {
    mockFindTool.mockResolvedValue(null);
    const result = await executeGatewayTool(validRequest);
    expect(result.audit).toBeDefined();
  });

  it('does not call provider when policy blocks', async () => {
    mockFindTool.mockResolvedValue(null);
    await executeGatewayTool(validRequest);
    expect(mockExecuteProvider).not.toHaveBeenCalled();
  });
});
