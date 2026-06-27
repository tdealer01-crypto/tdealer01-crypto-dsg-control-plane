import { describe, expect, it, vi } from 'vitest';
import { invokeRuntimeCommitRpc } from '../../../lib/runtime/commit-rpc';
import type { RuntimeCommitRpcArgs } from '../../../lib/runtime/commit-rpc';

const baseArgs: RuntimeCommitRpcArgs = {
  p_org_id: 'org-1',
  p_agent_id: 'agent-1',
  p_request_id: 'req-1',
  p_decision: 'allow',
  p_reason: 'policy pass',
  p_canonical_hash: 'abc123',
  p_canonical_json: { key: 'value' },
  p_agent_monthly_limit: 1000,
  p_org_plan_limit: 5000,
};

function makeClient(responses: Array<{ data: unknown; error: { message: string } | null }>) {
  let callCount = 0;
  return {
    rpc: vi.fn().mockImplementation(() => {
      const result = responses[callCount] ?? responses[responses.length - 1];
      callCount++;
      return Promise.resolve(result);
    }),
  };
}

describe('invokeRuntimeCommitRpc', () => {
  it('returns first call result with mode:latest when no error', async () => {
    const client = makeClient([{ data: { id: 'exec-1' }, error: null }]);
    const result = await invokeRuntimeCommitRpc(client, baseArgs);
    expect(result.mode).toBe('latest');
    expect(result.data).toEqual({ id: 'exec-1' });
    expect(result.error).toBeNull();
  });

  it('calls rpc exactly once when first call succeeds', async () => {
    const client = makeClient([{ data: {}, error: null }]);
    await invokeRuntimeCommitRpc(client, baseArgs);
    expect(client.rpc).toHaveBeenCalledTimes(1);
  });

  it('returns first result with mode:latest when error is non-signature-mismatch', async () => {
    const client = makeClient([{ data: null, error: { message: 'permission denied' } }]);
    const result = await invokeRuntimeCommitRpc(client, baseArgs);
    expect(result.mode).toBe('latest');
    expect(result.error?.message).toBe('permission denied');
    expect(client.rpc).toHaveBeenCalledTimes(1);
  });

  it('falls back to legacy call when error is schema cache mismatch', async () => {
    const signatureMismatch = {
      data: null,
      error: { message: 'runtime_commit_execution function schema cache miss' },
    };
    const legacyResult = { data: { id: 'exec-fallback' }, error: null };
    const client = makeClient([signatureMismatch, legacyResult]);

    const result = await invokeRuntimeCommitRpc(client, baseArgs);
    expect(result.mode).toBe('legacy');
    expect(result.data).toEqual({ id: 'exec-fallback' });
    expect(client.rpc).toHaveBeenCalledTimes(2);
  });

  it('strips p_agent_monthly_limit and p_org_plan_limit in the legacy call', async () => {
    const signatureMismatch = {
      data: null,
      error: { message: 'runtime_commit_execution function schema cache miss' },
    };
    const client = makeClient([signatureMismatch, { data: {}, error: null }]);

    await invokeRuntimeCommitRpc(client, baseArgs);

    const legacyCallArgs = client.rpc.mock.calls[1][1] as Record<string, unknown>;
    expect(legacyCallArgs.p_agent_monthly_limit).toBeUndefined();
    expect(legacyCallArgs.p_org_plan_limit).toBeUndefined();
    expect(legacyCallArgs.p_org_id).toBe('org-1');
  });

  it('first call always passes full args including limits', async () => {
    const client = makeClient([{ data: {}, error: null }]);
    await invokeRuntimeCommitRpc(client, baseArgs);

    const firstCallArgs = client.rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(firstCallArgs.p_agent_monthly_limit).toBe(1000);
    expect(firstCallArgs.p_org_plan_limit).toBe(5000);
  });

  it('first call uses function name runtime_commit_execution', async () => {
    const client = makeClient([{ data: {}, error: null }]);
    await invokeRuntimeCommitRpc(client, baseArgs);
    expect(client.rpc.mock.calls[0][0]).toBe('runtime_commit_execution');
  });

  it('handles args without optional limit fields', async () => {
    const argsNoLimits: RuntimeCommitRpcArgs = {
      p_org_id: 'org-2',
      p_agent_id: 'agent-2',
      p_request_id: 'req-2',
      p_decision: 'block',
      p_reason: 'policy block',
      p_canonical_hash: 'def456',
      p_canonical_json: {},
    };
    const client = makeClient([{ data: { id: 'exec-2' }, error: null }]);
    const result = await invokeRuntimeCommitRpc(client, argsNoLimits);
    expect(result.mode).toBe('latest');
    expect(result.data).toEqual({ id: 'exec-2' });
  });
});
