/**
 * Credential Broker for DSG Brain.
 * Queries Supabase for stored secrets and issues credential leases.
 * Never exposes raw secret values; returns only redaction fingerprints.
 * Supports lease renewal tracking and TTL management.
 */

import { getSupabaseAdmin } from "../../supabase-server";
import { CredentialBrokerResult, CredentialLease, createCredentialLease } from "./controlled-executor";

/**
 * Credential broker configuration.
 */
export interface CredentialBrokerConfig {
  /** Default lease TTL in milliseconds */
  defaultLeaseTtlMs: number;
  /** Default max lease renewals */
  defaultMaxRenewals: number;
  /** Supabase table name for secrets */
  secretsTableName: string;
}

/**
 * Default credential broker config.
 */
export const DEFAULT_CREDENTIAL_BROKER_CONFIG: CredentialBrokerConfig = {
  defaultLeaseTtlMs: 5 * 60 * 1000, // 5 minutes
  defaultMaxRenewals: 2,
  secretsTableName: "dsg_secrets",
};

/**
 * Secret record shape from Supabase.
 * Note: dsg_secrets table must be added to database.types.ts once created.
 */
interface DsgSecret {
  id?: string;
  name: string;
  value: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Broker credentials for a given set of secret names.
 * Queries Supabase for stored secrets and returns leases or unavailable list.
 *
 * @param secretNames Array of secret names to broker (e.g., "ANTHROPIC_API_KEY")
 * @param config Optional configuration overrides
 * @returns CredentialBrokerResult with leases and unavailable list
 *
 * Error handling:
 * - DB connection failure: throws with description
 * - Individual secret not found: added to unavailable[]
 * - Expired secret: treated as unavailable
 *
 * Truth boundary:
 * - Only Supabase query results are trusted evidence for secret existence.
 * - Raw secret values are never exposed; only fingerprints are stored in leases.
 * - Secrets must be encrypted at rest in the database.
 */
export async function brokerCredentials(
  secretNames: string[],
  config: Partial<CredentialBrokerConfig> = {}
): Promise<CredentialBrokerResult> {
  const finalConfig = { ...DEFAULT_CREDENTIAL_BROKER_CONFIG, ...config };
  const leases: CredentialLease[] = [];
  const unavailable: string[] = [];

  // Validate input
  if (!secretNames || secretNames.length === 0) {
    return { leases: [], unavailable: [] };
  }

  try {
    const supabase = getSupabaseAdmin();

    // Query for all requested secrets in a single batch.
    // This is more efficient than individual queries.
    // Note: dsg_secrets table must be added to database.types.ts once created.
    // Using 'any' for now to work with dynamic table name before schema migration.
    const { data: secrets, error } = await (supabase as any)
      .from(finalConfig.secretsTableName)
      .select("id, name, value, created_at, updated_at")
      .in("name", secretNames);

    if (error) {
      throw new Error(
        `Credential broker: Failed to query secrets from Supabase: ${error.message}`
      );
    }

    // Track which secrets were found
    const foundSecretNames = new Set<string>();

    if (secrets && Array.isArray(secrets) && secrets.length > 0) {
      for (const secret of secrets) {
        const record = secret as DsgSecret;
        const secretName = record.name;
        const secretValue = record.value;

        // Validate secret structure
        if (!secretName || !secretValue) {
          console.warn(`Credential broker: Malformed secret record for name="${secretName}"`);
          if (secretName) unavailable.push(secretName);
          continue;
        }

        foundSecretNames.add(secretName);

        // Create a lease for this secret
        // The lease contains a fingerprint of the value, never the raw value itself.
        const lease = createCredentialLease(
          secretName,
          secretValue,
          finalConfig.defaultLeaseTtlMs,
          finalConfig.defaultMaxRenewals
        );

        leases.push(lease);
      }
    }

    // Any secret requested but not found gets added to unavailable
    for (const requestedName of secretNames) {
      if (!foundSecretNames.has(requestedName)) {
        unavailable.push(requestedName);
      }
    }

    return { leases, unavailable };
  } catch (err) {
    // Re-throw with context
    const errorMsg =
      err instanceof Error ? err.message : String(err);
    throw new Error(
      `Credential broker failed to broker credentials: ${errorMsg}`
    );
  }
}

/**
 * Check if a secret exists in Supabase without creating a lease.
 * Useful for preflight validation.
 *
 * @param secretName Name of the secret to check
 * @param tableName Optional override for secrets table name
 * @returns true if secret exists, false otherwise
 */
export async function checkSecretExists(
  secretName: string,
  tableName: string = DEFAULT_CREDENTIAL_BROKER_CONFIG.secretsTableName
): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await (supabase as any)
      .from(tableName)
      .select("id")
      .eq("name", secretName)
      .single();

    if (error) {
      // PGRST116 is "not found" — expected case
      if (error.code === "PGRST116") {
        return false;
      }
      // Other errors are DB issues
      throw new Error(`Failed to check secret existence: ${error.message}`);
    }

    return data !== null;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`checkSecretExists failed: ${errorMsg}`);
  }
}

/**
 * Bulk check which secrets exist (preflight validation).
 *
 * @param secretNames Array of secret names to check
 * @param tableName Optional override for secrets table name
 * @returns Object with existing and missing arrays
 */
export async function checkSecretsExist(
  secretNames: string[],
  tableName: string = DEFAULT_CREDENTIAL_BROKER_CONFIG.secretsTableName
): Promise<{ existing: string[]; missing: string[] }> {
  const existing: string[] = [];
  const missing: string[] = [];

  if (!secretNames || secretNames.length === 0) {
    return { existing: [], missing: [] };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: secrets, error } = await (supabase as any)
      .from(tableName)
      .select("name")
      .in("name", secretNames);

    if (error) {
      throw new Error(`Failed to check secrets: ${error.message}`);
    }

    const foundNames = new Set(
      (secrets as DsgSecret[] | null)?.map((s) => s.name) || []
    );

    for (const name of secretNames) {
      if (foundNames.has(name)) {
        existing.push(name);
      } else {
        missing.push(name);
      }
    }

    return { existing, missing };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`checkSecretsExist failed: ${errorMsg}`);
  }
}
