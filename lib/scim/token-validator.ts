import { createHash } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-server';

/**
 * Hash SCIM token using SHA256
 */
export function hashScimToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Extract token from Authorization header
 */
export function extractScimToken(authHeader?: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove "Bearer " prefix
}

/**
 * Verify SCIM token against org_scim_tokens table
 * @param orgId Organization ID
 * @param token Raw SCIM token
 * @returns true if token is valid and enabled for the org
 */
export async function verifyScimToken(orgId: string, token: string): Promise<boolean> {
  if (!orgId || !token) {
    return false;
  }

  try {
    const supabase = getSupabaseAdmin() as any;
    const tokenHash = hashScimToken(token);

    // Query token directly - verify enabled and not expired
    const { data, error } = await supabase
      .from('org_scim_tokens')
      .select('id, is_enabled, expires_at')
      .eq('org_id', orgId)
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error) {
      console.error('[scim-token] Query error:', error);
      return false;
    }

    if (!data) {
      return false;
    }

    // Check if enabled
    if (!data.is_enabled) {
      return false;
    }

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return false;
    }

    // Update last_used_at for audit trail
    await supabase
      .from('org_scim_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
      .throwOnError() // Let errors be caught by outer try-catch

    return true;
  } catch (error) {
    console.error('[scim-token] Verification exception:', error);
    return false;
  }
}

/**
 * Validate SCIM Bearer token from request
 * Replaces basic string-length check with actual database verification
 */
export async function validateScimAuth(
  request: Request,
  orgId: string,
): Promise<{ valid: boolean; reason?: string }> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return { valid: false, reason: 'Missing Authorization header' };
  }

  const token = extractScimToken(authHeader);
  if (!token) {
    return { valid: false, reason: 'Invalid Authorization header format (must be Bearer <token>)' };
  }

  if (token.length < 20) {
    return { valid: false, reason: 'Token too short' };
  }

  const isValid = await verifyScimToken(orgId, token);
  if (!isValid) {
    return { valid: false, reason: 'Invalid or expired token' };
  }

  return { valid: true };
}
