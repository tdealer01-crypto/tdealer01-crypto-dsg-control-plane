import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeGatewayProvider } from '../../../lib/gateway/providers';
import type { GatewayToolRequest, GatewayToolRegistryEntry } from '../../../lib/gateway/types';

const baseRequest: GatewayToolRequest = {
  orgId: 'org-1',
  actorId: 'actor-1',
  actorRole: 'admin',
  orgPlan: 'enterprise',
  toolName: 'unknown.echo',
  action: 'execute',
  input: { key: 'value' },
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('executeGatewayProvider — unsupported/synthetic providers', () => {
  it('fails closed for the removed mock.* provider', async () => {
    const result = await executeGatewayProvider({ ...baseRequest, toolName: 'mock.echo' });
    expect(result).toMatchObject({
      ok: false,
      provider: 'unknown',
      toolName: 'mock.echo',
      error: 'provider_not_supported',
    });
    expect(result.result).toBeUndefined();
  });

  it('fails closed for any unrecognised provider', async () => {
    const result = await executeGatewayProvider({ ...baseRequest, toolName: 'some.unknown.tool' });
    expect(result.ok).toBe(false);
    expect(result.provider).toBe('unknown');
    expect(result.error).toBe('provider_not_supported');
    expect(result.result).toBeUndefined();
  });
});

describe('executeGatewayProvider — real provider configuration boundary', () => {
  it('does not fabricate Zapier success when no real webhook is configured', async () => {
    vi.stubEnv('ZAPIER_WEBHOOK_URL', '');
    vi.stubEnv('ZAPIER_WEBHOOK_ZAPIER_NOTIFY', '');

    const result = await executeGatewayProvider({ ...baseRequest, toolName: 'zapier.notify' });
    expect(result.ok).toBe(false);
    expect(result.provider).toBe('zapier');
    expect(result.error).toBe('provider_not_configured');
    expect(result.result).toBeUndefined();
  });

  it('does not fabricate custom_http success when no real endpoint is configured', async () => {
    vi.stubEnv('CUSTOM_HTTP_WEBHOOK_URL', '');
    const registryEntry: GatewayToolRegistryEntry = {
      name: 'custom.tool',
      provider: 'custom_http',
      action: 'run',
      risk: 'low',
      executionMode: 'gateway',
      requiresApproval: false,
      description: 'test',
    };

    const result = await executeGatewayProvider({ ...baseRequest, toolName: 'custom.tool' }, registryEntry);
    expect(result.ok).toBe(false);
    expect(result.provider).toBe('custom_http');
    expect(result.error).toBe('provider_not_configured');
    expect(result.result).toBeUndefined();
  });

  it('requires an actual configured endpoint before custom_http execution is even attempted', async () => {
    vi.stubEnv('CUSTOM_HTTP_WEBHOOK_URL', '');
    const result = await executeGatewayProvider({ ...baseRequest, toolName: 'custom_http.action' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('provider_not_configured');
  });
});
