/**
 * DSG Route Auth
 *
 * Resolves caller identity for /api/dsg/v1/* routes.
 * Two valid caller types:
 *   1. Org member — Supabase session (browser/dashboard)
 *   2. API client — Bearer API key (sdk / external integrations)
 *
 * Returns unified DsgCaller shape so route handlers don't need to
 * know which auth path was used.
 */

import { createHash } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase/server';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DsgCaller =
  | { ok: true; orgId: string; actorType: 'user';   userId: string; apiKeyId?: never }
  | { ok: true; orgId: string; actorType: 'api_key'; apiKeyId: string; userId?: never }
  | { ok: false; status: 401 | 403; error: string };

// ─── API Key resolution (same hashing pattern as agent-auth.ts) ──────────────

async function resolveApiKey(rawKey: string): Promise<DsgCaller> {
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from('api_keys')
    .select('id, org_id, status, scopes')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, status: 401, error: 'Invalid API key' };
  }

  if (data.status !== 'ACTIVE') {
    return { ok: false, status: 403, error: 'API key is inactive or revoked' };
  }

  // Check DSG scope if scopes are defined on the key
  // Scopes: 'read', 'write', 'admin', 'gates:evaluate', 'proofs:prove'
  if (Array.isArray(data.scopes) && data.scopes.length > 0) {
    const hasDsgScope =
      data.scopes.includes('admin') ||
      data.scopes.includes('write') ||
      data.scopes.includes('read') ||
      data.scopes.includes('gates:evaluate') ||
      data.scopes.includes('proofs:prove');
    if (!hasDsgScope) {
      return { ok: false, status: 403, error: 'API key lacks required scope' };
    }
  }

  // Bump last_used + requests_this_month atomically (fire-and-forget).
  // The database function exists in deployed DB but is not present in the
  // generated Supabase TypeScript function union, so use a narrow escape hatch.
  void (admin as any).rpc('touch_api_key_last_used', { p_key_hash: keyHash }).catch(
    (e: unknown) => console.warn('[dsg-auth] touch_api_key_last_used failed:', e)
  );

  return {
    ok: true,
    orgId: String(data.org_id),
    actorType: 'api_key',
    apiKeyId: String(data.id),
  };
}

// ─── Supabase session resolution ─────────────────────────────────────────────

async function resolveSession(): Promise<DsgCaller> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const admin = getSupabaseAdmin();
  const { data: profile, error: profileError } = await admin
    .from('users')
    .select('org_id, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (profileError || !profile?.org_id || !profile.is_active) {
    return { ok: false, status: 403, error: 'No active org profile' };
  }

  return {
    ok: true,
    orgId: String(profile.org_id),
    actorType: 'user',
    userId: user.id,
  };
}

// ─── Main: try API key first, fall back to session ───────────────────────────

/**
 * requireDsgAuth
 *
 * Call at the top of any /api/dsg/v1/* handler.
 * Accepts Bearer API key or Supabase session cookie.
 *
 * Usage:
 *   const caller = await requireDsgAuth(request);
 *   if (!caller.ok) return NextResponse.json({ error: caller.error }, { status: caller.status });
 *   // caller.orgId is now available
 */
export async function requireDsgAuth(request: Request): Promise<DsgCaller> {
  const authHeader = request.headers.get('authorization') ?? '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);

  if (bearerMatch?.[1]) {
    // Try as API key first
    const apiKeyResult = await resolveApiKey(bearerMatch[1]);
    if (apiKeyResult.ok) return apiKeyResult;

    // If it looks like a Supabase JWT (long, has dots), try session
    const token = bearerMatch[1];
    if (token.split('.').length === 3) {
      // Could be a Supabase JWT — fall through to session check
    } else {
      // Definitely an API key attempt that failed
      return apiKeyResult;
    }
  }

  // Fall back to Supabase cookie session
  return resolveSession();
}

/**
 * Quick helper to build a 401/403 NextResponse from a failed DsgCaller.
 * Import from 'next/server' in the route file.
 */
export function dsgAuthError(caller: DsgCaller & { ok: false }) {
  // Lazy import to avoid pulling next/server into non-route code
  const { NextResponse } = require('next/server');
  return NextResponse.json(
    { ok: false, error: caller.error },
    { status: caller.status }
  );
}

// ─── Audit log ───────────────────────────────────────────────────────────────

export interface DsgCallLog {
  orgId: string;
  actorType: 'user' | 'api_key';
  userId?: string;
  apiKeyId?: string;
  route: string;          // e.g. 'gates/evaluate'
  statusCode?: number;
  gateStatus?: string;    // 'PASS' | 'BLOCK' | 'REVIEW'
  proofId?: string;
  durationMs?: number;
}

/**
 * logDsgApiCall — fire-and-forget audit write to dsg_api_calls table.
 * Call at the end of each route handler. Never throws.
 *
 * Usage:
 *   void logDsgApiCall({ orgId: caller.orgId, actorType: caller.actorType,
 *     apiKeyId: caller.apiKeyId, route: 'gates/evaluate',
 *     statusCode: 200, gateStatus: result.gateStatus });
 */
export async function logDsgApiCall(log: DsgCallLog): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    await admin.from('dsg_api_calls').insert({
      org_id:      log.orgId,
      actor_type:  log.actorType,
      user_id:     log.userId     ?? null,
      api_key_id:  log.apiKeyId   ?? null,
      route:       log.route,
      method:      'POST',
      status_code: log.statusCode ?? null,
      gate_status: log.gateStatus ?? null,
      proof_id:    log.proofId    ?? null,
      duration_ms: log.durationMs ?? null,
    });
  } catch (e) {
    // Never let audit log failure break the request
    console.warn('[dsg-auth] logDsgApiCall failed:', e);
  }
}
