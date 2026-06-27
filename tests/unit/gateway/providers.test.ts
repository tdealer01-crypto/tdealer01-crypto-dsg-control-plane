import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeGatewayProvider } from '../../../lib/gateway/providers';
import type { GatewayToolRequest, GatewayToolRegistryEntry } from '../../../lib/gateway/types';

const baseRequest: GatewayToolRequest = {
  orgId: 'org-1',
  actorId: 'actor-1',
  actorRole: 'admin',
  orgPlan: 'enterprise',
  toolName: 'mock.echo',
  action: 'execute',
  input: { key: 'value' },
};

function makeFetchResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

describe('executeGatewayProvider — mock provider', () => {
  it('returns ok:true for mock. prefix tool', async () => {
    const result = await executeGatewayProvider({ ...baseRequest, toolName: 'mock.echo' });
    expect(result.ok).toBe(true);
    expect(result.provider).toBe('mock');
  });

  it('echoes the input in result', async () => {
    const result = await executeGatewayProvider({ ...baseRequest, toolName: 'mock.test', input: { x: 42 } });
    expect(result.result).toMatchObject({ echoed: { x: 42 } });
  });

  it('sets deterministic:true in mock result', async () => {
    const result = await executeGatewayProvider({ ...baseRequest, toolName: 'mock.test' });
    expect((result.result as Record<string, unknown>).deterministic).toBe(true);
  });
});

describe('executeGatewayProvider — unknown provider', () => {
  it('returns ok:false for unrecognised toolName with no registryEntry', async () => {
    const result = await executeGatewayProvider({ ...baseRequest, toolName: 'some.unknown.tool' });
    expect(result.ok).toBe(false);
    expect(result.provider).toBe('unknown');
    expect(result.error).toBe('provider_not_supported');
  });
});

describe('executeGatewayProvider — zapier provider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns provider_not_configured when no webhook URL env var set', async () => {
    vi.stubEnv('ZAPIER_WEBHOOK_URL', '');
    vi.stubEnv('ZAPIER_WEBHOOK_ZAPIER_NOTIFY', '');

    const result = await executeGatewayProvider({ ...baseRequest, toolName: 'zapier.notify' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('provider_not_configured');
    expect(result.provider).toBe('zapier');
  });

  it('uses tool-specific env key ZAPIER_WEBHOOK_{NORMALIZED_TOOL_NAME}', async () => {
    vi.stubEnv('ZAPIER_WEBHOOK_ZAPIER_SEND_EMAIL', 'https://hooks.zapier.com/specific');
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(makeFetchResponse(200, { status: 'success' }));

    const result = await executeGatewayProvider({ ...baseRequest, toolName: 'zapier.send_email' });
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith('https://hooks.zapier.com/specific', expect.any(Object));
  });

  it('falls back to ZAPIER_WEBHOOK_URL when specific key not set', async () => {
    vi.stubEnv('ZAPIER_WEBHOOK_ZAPIER_OTHER', '');
    vi.stubEnv('ZAPIER_WEBHOOK_URL', 'https://hooks.zapier.com/fallback');
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(makeFetchResponse(200, { ok: true }));

    const result = await executeGatewayProvider({ ...baseRequest, toolName: 'zapier.other' });
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith('https://hooks.zapier.com/fallback', expect.any(Object));
  });

  it('returns ok:false and error code on HTTP error response', async () => {
    vi.stubEnv('ZAPIER_WEBHOOK_URL', 'https://hooks.zapier.com/fallback');
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(makeFetchResponse(503, 'service unavailable'));

    const result = await executeGatewayProvider({ ...baseRequest, toolName: 'zapier.alert' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('provider_http_503');
  });

  it('handles non-JSON response body gracefully', async () => {
    vi.stubEnv('ZAPIER_WEBHOOK_URL', 'https://hooks.zapier.com/fallback');
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(makeFetchResponse(200, 'plain text response'));

    const result = await executeGatewayProvider({ ...baseRequest, toolName: 'zapier.test' });
    expect(result.ok).toBe(true);
    expect((result.result as Record<string, unknown>).raw).toBe('plain text response');
  });
});

describe('executeGatewayProvider — custom_http provider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns provider_not_configured when no endpointUrl and no env var', async () => {
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
    expect(result.error).toBe('provider_not_configured');
  });

  it('uses registryEntry.endpointUrl when set', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(makeFetchResponse(200, { done: true }));
    const registryEntry: GatewayToolRegistryEntry = {
      name: 'custom.action',
      provider: 'custom_http',
      action: 'execute',
      risk: 'medium',
      executionMode: 'gateway',
      requiresApproval: false,
      description: 'test',
      endpointUrl: 'https://my-webhook.example.com/hook',
    };

    const result = await executeGatewayProvider({ ...baseRequest, toolName: 'custom.action' }, registryEntry);
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith('https://my-webhook.example.com/hook', expect.any(Object));
  });

  it('activates custom_http path via toolName prefix custom_http.', async () => {
    vi.stubEnv('CUSTOM_HTTP_WEBHOOK_URL', 'https://custom-fallback.example.com');
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(makeFetchResponse(200, {}));

    const result = await executeGatewayProvider({ ...baseRequest, toolName: 'custom_http.my_action' });
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith('https://custom-fallback.example.com', expect.any(Object));
  });
});
