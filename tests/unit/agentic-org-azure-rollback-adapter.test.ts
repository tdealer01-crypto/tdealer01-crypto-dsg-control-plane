import { describe, expect, it, vi } from 'vitest';
import {
  AzureRollbackError,
  executeAzureRollback,
  getAzureAccessToken,
  swapAppServiceSlots,
  type AzureRollbackConfig,
} from '../../lib/agent-governance/agentic-org/azure-rollback-adapter';

const CONFIG: AzureRollbackConfig = {
  tenantId: 'tenant-1',
  clientId: 'client-1',
  clientSecret: 'secret-1',
  subscriptionId: 'sub-1',
  resourceGroup: 'rg-1',
  appServiceByRepository: {
    'tdealer01-crypto/dsg-agi-simulation': 'dsg-agi-simulation-app',
  },
};

const INPUT = {
  targetRepository: 'tdealer01-crypto/dsg-agi-simulation',
  promotionId: 'promotion-1',
  deploymentId: 'deploy-1',
  rollbackTarget: 'staging',
  healthProbePath: '/api/agent/status',
};

function fetchSequence(handlers: Array<(url: string, init?: RequestInit) => Response>) {
  let call = 0;
  return vi.fn(async (url: string, init?: RequestInit) => {
    const handler = handlers[call];
    call += 1;
    if (!handler) throw new Error(`unexpected fetch call ${call}: ${url}`);
    return handler(url, init);
  });
}

describe('getAzureAccessToken', () => {
  it('posts client-credentials and returns the access token', async () => {
    const fetcher = fetchSequence([
      () => new Response(JSON.stringify({ access_token: 'token-abc' }), { status: 200 }),
    ]);
    const token = await getAzureAccessToken(fetcher, CONFIG);
    expect(token).toBe('token-abc');
    expect(fetcher).toHaveBeenCalledWith(
      'https://login.microsoftonline.com/tenant-1/oauth2/v2.0/token',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('fails closed on a non-2xx token response', async () => {
    const fetcher = fetchSequence([() => new Response('nope', { status: 401 })]);
    await expect(getAzureAccessToken(fetcher, CONFIG)).rejects.toThrow(AzureRollbackError);
  });

  it('fails closed when the token response has no access_token', async () => {
    const fetcher = fetchSequence([() => new Response(JSON.stringify({}), { status: 200 })]);
    await expect(getAzureAccessToken(fetcher, CONFIG)).rejects.toThrow(AzureRollbackError);
  });
});

describe('swapAppServiceSlots', () => {
  it('completes immediately on a synchronous 200', async () => {
    const fetcher = fetchSequence([() => new Response(null, { status: 200 })]);
    await expect(swapAppServiceSlots(fetcher, 'token', CONFIG, 'app-1', 'staging')).resolves.toBeUndefined();
  });

  it('polls the returned location until the operation completes', async () => {
    const fetcher = fetchSequence([
      () => new Response(null, { status: 202, headers: { location: 'https://management.azure.com/poll' } }),
      () => new Response(null, { status: 202 }),
      () => new Response(null, { status: 200 }),
    ]);
    vi.useFakeTimers();
    const promise = swapAppServiceSlots(fetcher, 'token', CONFIG, 'app-1', 'staging');
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('fails closed when the swap request itself errors', async () => {
    const fetcher = fetchSequence([() => new Response('bad', { status: 500 })]);
    await expect(swapAppServiceSlots(fetcher, 'token', CONFIG, 'app-1', 'staging')).rejects.toThrow(AzureRollbackError);
  });

  it('fails closed when a 202 carries no polling URL', async () => {
    const fetcher = fetchSequence([() => new Response(null, { status: 202 })]);
    await expect(swapAppServiceSlots(fetcher, 'token', CONFIG, 'app-1', 'staging'))
      .rejects.toMatchObject({ code: 'AZURE_SLOT_SWAP_STATUS_URL_MISSING' });
  });
});

describe('executeAzureRollback', () => {
  it('gets a token, swaps the slot, checks health, and returns evidence', async () => {
    const fetcher = fetchSequence([
      () => new Response(JSON.stringify({ access_token: 'token-abc' }), { status: 200 }),
      () => new Response(null, { status: 200 }), // slot swap, synchronous
      () => new Response(null, { status: 200 }), // health check
    ]);
    const result = await executeAzureRollback(fetcher, CONFIG, INPUT);
    expect(result.status).toBe('ROLLED_BACK');
    expect(result.healthPassed).toBe(true);
    expect(result.evidenceHash).toMatch(/^[0-9a-f]{64}$/);

    const healthCall = fetcher.mock.calls[2];
    expect(healthCall[0]).toBe('https://dsg-agi-simulation-app.azurewebsites.net/api/agent/status');
  });

  it('fails closed for a repository with no registered App Service', async () => {
    const fetcher = fetchSequence([]);
    await expect(executeAzureRollback(fetcher, CONFIG, { ...INPUT, targetRepository: 'tdealer01-crypto/unregistered' }))
      .rejects.toMatchObject({ code: 'AZURE_APP_SERVICE_NOT_REGISTERED' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('fails closed when the post-swap health probe does not return ok', async () => {
    const fetcher = fetchSequence([
      () => new Response(JSON.stringify({ access_token: 'token-abc' }), { status: 200 }),
      () => new Response(null, { status: 200 }),
      () => new Response(null, { status: 503 }),
    ]);
    await expect(executeAzureRollback(fetcher, CONFIG, INPUT)).rejects.toMatchObject({ code: 'AZURE_ROLLBACK_HEALTH_CHECK_FAILED' });
  });

  it('fails closed when the health probe request throws', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token-abc' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockRejectedValueOnce(new Error('network unreachable'));
    await expect(executeAzureRollback(fetcher as unknown as typeof fetch, CONFIG, INPUT)).rejects.toMatchObject({ code: 'AZURE_ROLLBACK_HEALTH_CHECK_FAILED' });
  });
});
