import { hashMcpApiKey } from '@/lib/dsg/mcp/api-key-crypto';
import {
  callDsgRpc,
  getDsgSupabaseRpcConfig,
} from '@/lib/dsg/server/supabase-rpc';
import type { RuntimeRole } from '@/lib/authz';

export type UnifiedAuthContext = {
  source: 'api-key' | 'session';
  actorId: string;
  orgId: string;
  roles: RuntimeRole[];
  keyId?: string;
  planId?: string;
  callsUsed?: number;
  callsLimit?: number;
};

type StoredKeyRow = {
  key_id: string;
  key_actor_id: string;
  actor_id: string;
  org_id: string;
  roles: string[];
  plan_id: string;
  calls_used: number;
  calls_limit: number;
};

type StoredKeyValidation =
  | { presented: false; valid: false }
  | { presented: true; valid: false; reason: string }
  | { presented: true; valid: true; context: UnifiedAuthContext };

function extractRawMcpKey(request: Request): string | undefined {
  const explicit =
    request.headers.get('x-dsg-api-key') ?? request.headers.get('x-api-key');
  if (explicit?.trim()) return explicit.trim();

  const authorization = request.headers.get('authorization');
  if (!authorization?.toLowerCase().startsWith('bearer ')) return undefined;
  const bearer = authorization.slice('bearer '.length).trim();
  return bearer.startsWith('dsg_') ? bearer : undefined;
}

function normalizeRuntimeRole(value: string): RuntimeRole | null {
  if (
    value === 'org_admin' ||
    value === 'operator' ||
    value === 'reviewer' ||
    value === 'runtime_auditor' ||
    value === 'billing_admin'
  ) {
    return value;
  }
  return null;
}

export async function validateStoredUnifiedMcpKey(
  request: Request,
  toolName: string,
): Promise<StoredKeyValidation> {
  const rawKey = extractRawMcpKey(request);
  if (!rawKey) return { presented: false, valid: false };
  if (!rawKey.startsWith('dsg_')) {
    return { presented: true, valid: false, reason: 'INVALID_MCP_KEY_FORMAT' };
  }

  try {
    const keyHash = await hashMcpApiKey(rawKey);
    const config = getDsgSupabaseRpcConfig();
    const rows = await callDsgRpc<StoredKeyRow[]>(
      config,
      'validate_mcp_api_key_context',
      { p_key_hash: keyHash },
    );
    const row = rows?.[0];

    if (!row?.key_id || !row.key_actor_id || !row.actor_id || !row.org_id) {
      return {
        presented: true,
        valid: false,
        reason: 'MCP_KEY_REVOKED_EXPIRED_OR_QUOTA_EXCEEDED',
      };
    }

    const roles = Array.from(
      new Set(
        (Array.isArray(row.roles) ? row.roles : [])
          .map((role) => normalizeRuntimeRole(String(role)))
          .filter((role): role is RuntimeRole => Boolean(role)),
      ),
    ).sort();

    if (roles.length === 0) {
      return { presented: true, valid: false, reason: 'MCP_KEY_ACTOR_NOT_ACTIVE' };
    }

    // Meter only after the key, actor, and runtime roles pass authorization.
    await callDsgRpc<void>(config, 'record_mcp_usage', {
      p_key_id: row.key_id,
      p_actor_id: row.key_actor_id,
      p_tool_name: toolName,
    });

    return {
      presented: true,
      valid: true,
      context: {
        source: 'api-key',
        actorId: row.actor_id,
        orgId: row.org_id,
        roles,
        keyId: String(row.key_id),
        planId: String(row.plan_id),
        callsUsed: Number(row.calls_used),
        callsLimit: Number(row.calls_limit),
      },
    };
  } catch {
    // Missing DB configuration, RPC failures, or role-resolution failures deny access.
    return { presented: true, valid: false, reason: 'MCP_KEY_VALIDATION_UNAVAILABLE' };
  }
}
