import { describe, expect, it, vi } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { findManagedGatewayTool } from '../../../lib/gateway/managed-connectors';

function makeChain(result: { data: unknown; error: { message: string } | null }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  return chain;
}

const connectedData = {
  name: 'slack.send',
  provider: 'custom_http',
  action: 'send_message',
  risk: 'medium',
  execution_mode: 'gateway',
  requires_approval: false,
  description: 'Send a Slack message',
  connector_id: 'conn-1',
  gateway_connectors: { endpoint_url: 'https://hook.example.com', status: 'connected' },
};

describe('findManagedGatewayTool', () => {
  it('returns null when orgId is empty', async () => {
    const result = await findManagedGatewayTool('', 'slack.send');
    expect(result).toBeNull();
  });

  it('returns null when toolName is empty', async () => {
    const result = await findManagedGatewayTool('org-1', '');
    expect(result).toBeNull();
  });

  it('returns null when data is null and no error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect(await findManagedGatewayTool('org-1', 'missing-tool')).toBeNull();
  });

  it('returns null silently when error message contains "relation"', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'relation "gateway_tools" does not exist' } }));
    expect(await findManagedGatewayTool('org-1', 'some-tool')).toBeNull();
  });

  it('throws on non-relation DB error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'connection refused' } }));
    await expect(findManagedGatewayTool('org-1', 'tool')).rejects.toThrow('failed_to_read_gateway_tool:connection refused');
  });

  it('returns null when connector status is not connected', async () => {
    const data = { ...connectedData, gateway_connectors: { endpoint_url: 'https://hook.example.com', status: 'disconnected' } };
    mockFrom.mockReturnValue(makeChain({ data, error: null }));
    expect(await findManagedGatewayTool('org-1', 'slack.send')).toBeNull();
  });

  it('returns null when gateway_connectors is null', async () => {
    const data = { ...connectedData, gateway_connectors: null };
    mockFrom.mockReturnValue(makeChain({ data, error: null }));
    expect(await findManagedGatewayTool('org-1', 'slack.send')).toBeNull();
  });

  it('returns registry entry with correct fields on success (object connector)', async () => {
    mockFrom.mockReturnValue(makeChain({ data: connectedData, error: null }));
    const result = await findManagedGatewayTool('org-1', 'slack.send');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('slack.send');
    expect(result!.provider).toBe('custom_http');
    expect(result!.endpointUrl).toBe('https://hook.example.com');
    expect(result!.requiresApproval).toBe(false);
  });

  it('returns registry entry when gateway_connectors is an array', async () => {
    const data = {
      ...connectedData,
      gateway_connectors: [{ endpoint_url: 'https://hook2.example.com', status: 'connected' }],
    };
    mockFrom.mockReturnValue(makeChain({ data, error: null }));
    const result = await findManagedGatewayTool('org-1', 'slack.send');
    expect(result!.endpointUrl).toBe('https://hook2.example.com');
  });

  it('converts requires_approval to boolean', async () => {
    const data = { ...connectedData, requires_approval: true };
    mockFrom.mockReturnValue(makeChain({ data, error: null }));
    const result = await findManagedGatewayTool('org-1', 'slack.send');
    expect(result!.requiresApproval).toBe(true);
  });

  it('falls back to "Managed gateway tool" description when description is null', async () => {
    const data = { ...connectedData, description: null };
    mockFrom.mockReturnValue(makeChain({ data, error: null }));
    const result = await findManagedGatewayTool('org-1', 'slack.send');
    expect(result!.description).toBe('Managed gateway tool');
  });
});
