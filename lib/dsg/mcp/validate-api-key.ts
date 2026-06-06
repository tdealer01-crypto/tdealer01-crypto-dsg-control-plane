import { getDsgSupabaseRpcConfig, callDsgRpc } from '@/lib/dsg/server/supabase-rpc';
import { hashMcpApiKey } from './api-key-crypto';

type ValidateRow = {
  key_id: string;
  actor_id: string;
  plan_id: string;
  calls_used: number;
  calls_limit: number;
};

export type KeyValidationResult =
  | { valid: false }
  | { valid: true; keyId: string; actorId: string; planId: string; callsUsed: number; callsLimit: number };

export async function validateApiKeyFromHeaders(headers: Headers): Promise<KeyValidationResult> {
  const rawKey = headers.get('x-dsg-api-key');
  if (!rawKey) return { valid: false };

  const keyHash = await hashMcpApiKey(rawKey);
  const config = getDsgSupabaseRpcConfig();

  const rows = await callDsgRpc<ValidateRow[]>(config, 'validate_mcp_api_key', {
    p_key_hash: keyHash,
  });

  if (!rows || rows.length === 0) return { valid: false };

  const row = rows[0];
  return {
    valid: true,
    keyId: row.key_id,
    actorId: row.actor_id,
    planId: row.plan_id,
    callsUsed: row.calls_used,
    callsLimit: row.calls_limit,
  };
}

export async function recordApiKeyUsage(
  keyId: string,
  actorId: string,
  toolName: string,
): Promise<void> {
  const config = getDsgSupabaseRpcConfig();
  await callDsgRpc(config, 'record_mcp_usage', {
    p_key_id: keyId,
    p_actor_id: actorId,
    p_tool_name: toolName,
  });
}
