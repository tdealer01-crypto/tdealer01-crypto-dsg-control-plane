import { hashMcpApiKey } from '@/lib/dsg/mcp/api-key-crypto';
import {
  callDsgRpc,
  getDsgSupabaseRpcConfig,
} from '@/lib/dsg/server/supabase-rpc';
import { getSupabaseAdmin } from '@/lib/supabase-server';
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
  actor_id: string;
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

async function resolveStoredKeyActor(
  authUserId: string,
): Promise<{ actorId: string; orgId: string; roles: RuntimeRole[] } | null> {
  const admin = getSupabaseAdmin();
  const profile = await admin
    .from('users')
    .select('id, org_id, is_active, role')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (profile.error || !profile.data?.id || !profile.data?.org_id || !profile.data.is_active) {
    return null;
  }

  const actorId = String(profile.data.id);
  const orgId = String(profile.data.org_id);
  const baseRole = String(profile.data.role ?? '').trim().toLowerCase();

  const roleRows = await admin
    .from('runtime_roles')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', actorId);

  if (roleRows.error) return null;

  const roles = new Set<RuntimeRole>();
  for (const row of roleRows.data ?? []) {
    const role = normalizeRuntimeRole(String(row.role));
    if (role) roles.add(role);
  }

  // Match the established authz bootstrap behavior for owner/admin profiles.
  if (baseRole === 'owner' || baseRole === 'admin') {
    roles.add('org_admin');
    roles.add('operator');
    roles.add('reviewer');
    roles.add('runtime_auditor');
    roles.add('billing_admin');
  } else {
    const baseRuntimeRole = normalizeRuntimeRole(baseRole);
    if (baseRuntimeRole) roles.add(baseRuntimeRole);
    if (baseRole === 'viewer' || baseRole === 'guest_auditor') roles.add('reviewer');
  }

  return { actorId, orgId, roles: Array.from(roles).sort() };
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
    const rows = await callDsgRpc<StoredKeyRow[]>(config, 'validate_mcp_api_key', {
      p_key_hash: keyHash,
    });
    const row = rows?.[0];
    if (!row?.key_id || !row.actor_id) {
      return { presented: true, valid: false, reason: 'MCP_KEY_REVOKED_EXPIRED_OR_QUOTA_EXCEEDED' };
    }

    const actor = await resolveStoredKeyActor(String(row.actor_id));
    if (!actor) {
      return { presented: true, valid: false, reason: 'MCP_KEY_ACTOR_NOT_ACTIVE' };
    }

    // Meter only after the key and actor have both passed authorization checks.
    await callDsgRpc<void>(config, 'record_mcp_usage', {
      p_key_id: row.key_id,
      p_actor_id: row.actor_id,
      p_tool_name: toolName,
    });

    return {
      presented: true,
      valid: true,
      context: {
        source: 'api-key',
        actorId: actor.actorId,
        orgId: actor.orgId,
        roles: actor.roles,
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
