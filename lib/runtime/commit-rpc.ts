type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => unknown;
};

export type RuntimeCommitRpcArgs = {
  p_org_id: string;
  p_agent_id: string;
  p_request_id: string;
  p_decision: string;
  p_reason: string;
  p_metadata?: Record<string, unknown>;
  p_canonical_hash: string;
  p_canonical_json: Record<string, unknown>;
  p_latency_ms?: number;
  p_request_payload?: Record<string, unknown>;
  p_context_payload?: Record<string, unknown>;
  p_policy_version?: string | null;
  p_audit_evidence?: Record<string, unknown>;
  p_usage_amount_usd?: number;
  p_created_at?: string;
  p_agent_monthly_limit?: number;
  p_org_plan_limit?: number;
};

function isRpcSignatureMismatch(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('runtime_commit_execution') &&
    normalized.includes('schema cache') &&
    normalized.includes('function')
  );
}

function toLegacyArgs(args: RuntimeCommitRpcArgs) {
  // Preserve quota parameters so schema-cache fallback cannot silently bypass
  // agent/org billing guardrails by reverting them to SQL defaults.
  return { ...args };
}

export async function invokeRuntimeCommitRpc(client: RpcClient, args: RuntimeCommitRpcArgs) {
  const first = await client.rpc('runtime_commit_execution', args) as { data: unknown; error: { message: string } | null };
  if (!first.error) {
    return { ...first, mode: 'latest' as const };
  }

  if (!isRpcSignatureMismatch(first.error.message)) {
    return { ...first, mode: 'latest' as const };
  }

  const fallback = await client.rpc('runtime_commit_execution', toLegacyArgs(args)) as { data: unknown; error: { message: string } | null };
  return { ...fallback, mode: 'legacy' as const };
}
