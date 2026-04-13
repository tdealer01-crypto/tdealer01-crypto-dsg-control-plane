import { invokeRuntimeCommitRpc, type RuntimeCommitRpcArgs } from '../../../lib/runtime/commit-rpc';

describe('invokeRuntimeCommitRpc', () => {
  const baseArgs: RuntimeCommitRpcArgs = {
    p_org_id: 'org_1',
    p_agent_id: 'agent_1',
    p_request_id: 'req_1',
    p_decision: 'allow',
    p_reason: 'ok',
    p_canonical_hash: 'hash_1',
    p_canonical_json: { ok: true },
    p_agent_monthly_limit: 100,
    p_org_plan_limit: 1000,
  };

  it('preserves quota args in fallback retry payload', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Could not find the function public.runtime_commit_execution in the schema cache',
        },
      })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });

    const result = await invokeRuntimeCommitRpc({ rpc }, baseArgs);

    expect(result.error).toBeNull();
    expect(result.mode).toBe('legacy');
    expect(rpc).toHaveBeenNthCalledWith(1, 'runtime_commit_execution', baseArgs);
    expect(rpc).toHaveBeenNthCalledWith(2, 'runtime_commit_execution', expect.objectContaining({
      p_agent_monthly_limit: 100,
      p_org_plan_limit: 1000,
    }));
  });
});
