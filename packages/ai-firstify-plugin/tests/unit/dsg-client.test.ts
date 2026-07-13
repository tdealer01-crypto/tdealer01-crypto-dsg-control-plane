import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDSGClient } from '../../src/lib/dsg-client';

describe('DSGClient', () => {
  let client;

  beforeEach(() => {
    client = createDSGClient(
      'https://api.example.com',
      'test-api-key'
    );
  });

  it('should initialize with correct base and key', () => {
    expect(client).toBeDefined();
  });

  it('should handle governance evaluation', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            decision: 'PASS',
            reason: 'Approved',
            policies: ['policy-1'],
          }),
      })
    );

    const result = await client.evaluateGovernance({
      modelId: 'test-model',
      action: 'deploy',
      context: {},
    });

    expect(result.decision).toBe('pass');
    expect(result.reason).toBe('Approved');
  });
});
