/**
 * Execution Grant Persistence Layer for DSG Brain.
 * Stores and retrieves execution grants from Supabase to survive restarts.
 * Never stores raw secrets - only redaction fingerprints and grant metadata.
 */

import { ExecutionGrant } from "./controlled-executor";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

/**
 * Save an execution grant to Supabase.
 * Persists the grant with expiration time for cleanup.
 */
export async function saveGrant(grant: ExecutionGrant): Promise<void> {
  const supabase = getSupabaseAdmin();

  const expiresAt = new Date(grant.issuedAt + grant.ttlMs).toISOString();

  const { error } = await supabase.from("dsg_execution_grants").insert({
    id: grant.grantId,
    plan_hash: grant.planHash,
    grant_id: grant.grantId,
    issued_at: new Date(grant.issuedAt).toISOString(),
    ttl_ms: grant.ttlMs,
    renewals: grant.renewals,
    max_renewals: grant.maxRenewals,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(
      `Failed to save execution grant: ${error.message}`
    );
  }
}

/**
 * Load an execution grant from Supabase by grantId.
 * Returns null if not found or expired.
 */
export async function loadGrant(grantId: string): Promise<ExecutionGrant | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("dsg_execution_grants")
    .select("*")
    .eq("grant_id", grantId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    throw new Error(
      `Failed to load execution grant: ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  // Check if grant has expired
  const expiresAt = new Date(data.expires_at).getTime();
  if (Date.now() > expiresAt) {
    // Clean up expired grant
    await deleteGrant(grantId).catch(() => {
      // Ignore cleanup errors
    });
    return null;
  }

  return {
    grantId: data.grant_id,
    planHash: data.plan_hash,
    issuedAt: new Date(data.issued_at).getTime(),
    ttlMs: data.ttl_ms,
    renewals: data.renewals,
    maxRenewals: data.max_renewals,
  };
}

/**
 * Delete an execution grant from Supabase.
 */
export async function deleteGrant(grantId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("dsg_execution_grants")
    .delete()
    .eq("grant_id", grantId);

  if (error) {
    throw new Error(
      `Failed to delete execution grant: ${error.message}`
    );
  }
}

/**
 * Get all active (non-expired) execution grants.
 * Used on startup to restore grants from previous sessions.
 */
export async function getAllActiveGrants(): Promise<ExecutionGrant[]> {
  const supabase = getSupabaseAdmin();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("dsg_execution_grants")
    .select("*")
    .gt("expires_at", now)
    .order("issued_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to load active grants: ${error.message}`
    );
  }

  if (!data) {
    return [];
  }

  return data.map((row) => ({
    grantId: row.grant_id,
    planHash: row.plan_hash,
    issuedAt: new Date(row.issued_at).getTime(),
    ttlMs: row.ttl_ms,
    renewals: row.renewals,
    maxRenewals: row.max_renewals,
  }));
}

/**
 * Clean up expired execution grants from Supabase.
 * Should be called periodically to prevent table bloat.
 */
export async function cleanupExpiredGrants(): Promise<number> {
  const supabase = getSupabaseAdmin();

  const now = new Date().toISOString();

  const { error, count } = await supabase
    .from("dsg_execution_grants")
    .delete()
    .lt("expires_at", now);

  if (error) {
    throw new Error(
      `Failed to cleanup expired grants: ${error.message}`
    );
  }

  return count ?? 0;
}
