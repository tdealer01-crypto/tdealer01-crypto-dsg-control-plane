import { hashMcpApiKey } from '@/lib/dsg/mcp/api-key-crypto';
import { hashAccessToken } from './oauth-helper';
import {
  callDsgRpc,
  getDsgSupabaseRpcConfig,
} from '@/lib/dsg/server/supabase-rpc';
import type { RuntimeRole } from '@/lib/authz';

export type UnifiedAuthContext = {
  source: 'api-key' | 'oauth' | 'session';
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

type StoredOAuthRow = {
  token_id: string;
  key_id: string;
  key_actor_id: string;
  actor_id: string;
  org_id: string;
  roles: string[];
  plan_id: string;
  calls_used: number;
  calls_limit: number;
  scope: string;
};

type StoredKeyValidation =
  | { presented: false; valid: false }
  | { presented: true; valid: false; reason: string }
  | { presented: true; valid: true; context: UnifiedAuthContext };

type PresentedCredential =
  | { kind: 'api-key'; value: string }
  | { kind: 'oauth'; value: string }
  | { kind: 'invalid'; reason: string }
  | null;

function extractPresentedCredential(request: Request): PresentedCredential {
  const explicit = request.headers.get('x-dsg-api-key') ?? request.headers.get('x-api-key');
  if (explicit?.trim()) {
    const value = explicit.trim();
    return value.startsWith('dsg_')
      ? { kind: 'api-key', value }
      : { kind: 'invalid', reason: 'INVALID_MCP_KEY_FORMAT' };
  }

  const authorization = request.headers.get('authorization');
  if (!authorization) return null;

  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return { kind: 'invalid', reason: 'INVALID_MCP_AUTH_SCHEME' };
  }

  const bearer = authorization.slice('bearer '.length).trim();
  if (bearer.startsWith('dsg_')) return { kind: 'api-key', value: bearer };
  if (bearer.startsWith('mcp_')) return { kind: 'oauth', value: bearer };

  return { kind: 'invalid', reason: 'INVALID_MCP_CREDENTIAL_FORMAT' };
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

function normalizeRoles(values: unknown): RuntimeRole[] {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((role) => normalizeRuntimeRole(String(role)))
        .filter((role): role is RuntimeRole => Boolean(role)),
    ),
  ).sort();
}

function hasRequiredOAuthScope(scope: unknown): boolean {
  return typeof scope === 'string' && scope.trim().split(' ').includes('mcp:execute');
}

export async function validateStoredUnifiedMcpKey(
  request: Request,
  toolName: string,
): Promise<StoredKeyValidation> {
  const credential = extractPresentedCredential(request);
  if (!credential) return { presented: false, valid: false };
  if (credential.kind === 'invalid') {
    return { presented: true, valid: false, reason: credential.reason };
  }

  try {
    const config = getDsgSupabaseRpcConfig();

    if (credential.kind === 'api-key') {
      const keyHash = await hashMcpApiKey(credential.value);
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

      const roles = normalizeRoles(row.roles);
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
    }

    const tokenHash = hashAccessToken(credential.value);
    const rows = await callDsgRpc<StoredOAuthRow[]>(
      config,
      'validate_mcp_oauth_token_context',
      { p_token_hash: tokenHash },
    );
    const row = rows?.[0];

    if (
      !row?.token_id ||
      !row.key_id ||
      !row.key_actor_id ||
      !row.actor_id ||
      !row.org_id ||
      !hasRequiredOAuthScope(row.scope)
    ) {
      return {
        presented: true,
        valid: false,
        reason: 'MCP_OAUTH_TOKEN_INVALID_EXPIRED_REVOKED_OR_QUOTA_EXCEEDED',
      };
    }

    const roles = normalizeRoles(row.roles);
    if (roles.length === 0) {
      return { presented: true, valid: false, reason: 'MCP_OAUTH_ACTOR_NOT_ACTIVE' };
    }

    // OAuth tokens inherit the linked API key quota and also update token last-used state.
    await callDsgRpc<void>(config, 'record_mcp_usage', {
      p_key_id: row.key_id,
      p_actor_id: row.key_actor_id,
      p_tool_name: toolName,
    });
    await callDsgRpc<void>(config, 'record_mcp_oauth_token_usage', {
      p_token_id: row.token_id,
    });

    return {
      presented: true,
      valid: true,
      context: {
        source: 'oauth',
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
