/**
 * Credential Lease Persistence Layer for DSG Brain.
 * Stores and retrieves credential leases from Supabase to survive restarts.
 * Never stores raw secret values - only redaction fingerprints.
 */

import { CredentialLease } from "./controlled-executor";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

/**
 * Save a credential lease to Supabase.
 * Persists the lease with expiration time for cleanup.
 */
export async function saveLease(lease: CredentialLease): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await (supabase as any).from("dsg_credential_leases").insert({
    id: lease.leaseId,
    lease_id: lease.leaseId,
    secret_name: lease.secretName,
    redaction_fingerprint: lease.redactionFingerprint,
    expires_at: new Date(lease.expiresAt).toISOString(),
    valid: lease.valid,
    renewals: lease.renewals,
    max_renewals: lease.maxRenewals,
  });

  if (error) {
    throw new Error(
      `Failed to save credential lease: ${error.message}`
    );
  }
}

/**
 * Load a credential lease from Supabase by leaseId.
 * Returns null if not found or expired.
 */
export async function loadLease(leaseId: string): Promise<CredentialLease | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("dsg_credential_leases")
    .select("*")
    .eq("lease_id", leaseId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    throw new Error(
      `Failed to load credential lease: ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  // Check if lease has expired
  const expiresAt = new Date(data.expires_at).getTime();
  if (Date.now() > expiresAt) {
    // Clean up expired lease
    await deleteLease(leaseId).catch(() => {
      // Ignore cleanup errors
    });
    return null;
  }

  return {
    leaseId: data.lease_id,
    secretName: data.secret_name,
    redactionFingerprint: data.redaction_fingerprint,
    expiresAt: expiresAt,
    valid: data.valid,
    renewals: data.renewals,
    maxRenewals: data.max_renewals,
  };
}

/**
 * Delete a credential lease from Supabase.
 */
export async function deleteLease(leaseId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("dsg_credential_leases")
    .delete()
    .eq("lease_id", leaseId);

  if (error) {
    throw new Error(
      `Failed to delete credential lease: ${error.message}`
    );
  }
}

/**
 * Get all active (non-expired, valid) credential leases.
 * Used on startup to restore leases from previous sessions.
 */
export async function getAllActiveLeases(): Promise<CredentialLease[]> {
  const supabase = getSupabaseAdmin();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("dsg_credential_leases")
    .select("*")
    .gt("expires_at", now)
    .eq("valid", true)
    .order("expires_at", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to load active leases: ${error.message}`
    );
  }

  if (!data) {
    return [];
  }

  return data.map((row) => ({
    leaseId: row.lease_id,
    secretName: row.secret_name,
    redactionFingerprint: row.redaction_fingerprint,
    expiresAt: new Date(row.expires_at).getTime(),
    valid: row.valid,
    renewals: row.renewals,
    maxRenewals: row.max_renewals,
  }));
}

/**
 * Update lease validity status (e.g., mark as invalid if revoked).
 */
export async function invalidateLease(leaseId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("dsg_credential_leases")
    .update({ valid: false })
    .eq("lease_id", leaseId);

  if (error) {
    throw new Error(
      `Failed to invalidate credential lease: ${error.message}`
    );
  }
}

/**
 * Clean up expired credential leases from Supabase.
 * Should be called periodically to prevent table bloat.
 */
export async function cleanupExpiredLeases(): Promise<number> {
  const supabase = getSupabaseAdmin();

  const now = new Date().toISOString();

  const { error, count } = await supabase
    .from("dsg_credential_leases")
    .delete()
    .lt("expires_at", now);

  if (error) {
    throw new Error(
      `Failed to cleanup expired leases: ${error.message}`
    );
  }

  return count ?? 0;
}
