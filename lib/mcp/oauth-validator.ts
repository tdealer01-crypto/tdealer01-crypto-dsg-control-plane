import { getDsgSupabaseRpcConfig, callDsgRpc } from '@/lib/dsg/server/supabase-rpc';
import { hashAccessToken } from './oauth-helper';

/**
 * OAuth token validation for MCP server
 * Validates access token, checks subscription status, returns usage info
 */

type ValidateOAuthTokenResult = {
  valid: false;
} | {
  valid: true;
  tokenId: string;
  actorId: string;
  keyId: string;
  scope: string;
  tokenType: string;
  subscriptionActive: boolean;
  callsUsed: number;
  callsLimit: number;
  expiresAt: string;
};

type RpcValidationRow = {
  token_id: string;
  actor_id: string;
  key_id: string;
  scope: string;
  token_type: string;
  expires_at: string;
  subscription_active: boolean;
  calls_used: number;
  calls_limit: number;
};

/**
 * Validate OAuth access token
 * Returns token info + MCP key usage stats if valid
 */
export async function validateOAuthToken(
  accessToken: string,
): Promise<ValidateOAuthTokenResult> {
  if (!accessToken || !accessToken.startsWith('mcp_')) {
    return { valid: false };
  }

  try {
    const tokenHash = hashAccessToken(accessToken);
    const config = getDsgSupabaseRpcConfig();

    const rows = await callDsgRpc<RpcValidationRow[]>(config, 'validate_mcp_oauth_token', {
      p_token_hash: tokenHash,
    });

    if (!rows || rows.length === 0) {
      return { valid: false };
    }

    const row = rows[0];
    return {
      valid: true,
      tokenId: row.token_id,
      actorId: row.actor_id,
      keyId: row.key_id,
      scope: row.scope,
      tokenType: row.token_type,
      subscriptionActive: row.subscription_active,
      callsUsed: row.calls_used,
      callsLimit: row.calls_limit,
      expiresAt: row.expires_at,
    };
  } catch (error) {
    console.error('[validateOAuthToken] RPC call failed:', error);
    return { valid: false };
  }
}

/**
 * Record OAuth token usage (last_used_at timestamp)
 */
export async function recordOAuthTokenUsage(tokenId: string): Promise<void> {
  try {
    const config = getDsgSupabaseRpcConfig();
    await callDsgRpc(config, 'record_mcp_oauth_token_usage', {
      p_token_id: tokenId,
    });
  } catch (error) {
    console.error('[recordOAuthTokenUsage] RPC call failed:', error);
    // Non-fatal; continue even if recording fails
  }
}

/**
 * Revoke OAuth token
 */
export async function revokeOAuthToken(tokenHash: string, actorId: string): Promise<void> {
  try {
    const config = getDsgSupabaseRpcConfig();
    await callDsgRpc(config, 'revoke_mcp_oauth_token', {
      p_token_hash: tokenHash,
      p_actor_id: actorId,
    });
  } catch (error) {
    console.error('[revokeOAuthToken] RPC call failed:', error);
    throw new Error('Failed to revoke token');
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(\S+)$/i);
  if (!match) return null;

  return match[1];
}

/**
 * Check if token is quota exceeded (for HTTP response code selection)
 */
export function isQuotaExceeded(validation: ValidateOAuthTokenResult): boolean {
  if (!validation.valid) return false;
  return validation.callsUsed >= validation.callsLimit;
}

/**
 * Check if subscription is inactive (for HTTP response code selection)
 */
export function isSubscriptionInactive(validation: ValidateOAuthTokenResult): boolean {
  if (!validation.valid) return false;
  return !validation.subscriptionActive;
}

/**
 * Get appropriate HTTP status code for validation result
 */
export function getHttpStatusForValidation(validation: ValidateOAuthTokenResult): number {
  if (!validation.valid) return 401; // Unauthorized

  if (isQuotaExceeded(validation)) return 402; // Payment Required
  if (isSubscriptionInactive(validation)) return 402; // Payment Required

  return 200; // OK
}

/**
 * Get error message for validation result
 */
export function getErrorMessageForValidation(validation: ValidateOAuthTokenResult): string {
  if (!validation.valid) {
    return 'Invalid or expired access token';
  }

  if (isQuotaExceeded(validation)) {
    return 'Monthly API quota exceeded';
  }

  if (isSubscriptionInactive(validation)) {
    return 'MCP API subscription not active';
  }

  return 'Unauthorized';
}
