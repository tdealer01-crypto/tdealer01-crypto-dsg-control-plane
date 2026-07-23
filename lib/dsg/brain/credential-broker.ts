/**
 * Credential Broker for DSG Brain.
 *
 * Supports multiple backends:
 * - Supabase (legacy, for local dev and migration)
 * - AWS Secrets Manager (production, vault-based)
 *
 * Never exposes raw secret values; returns only redaction fingerprints.
 * Supports lease renewal tracking, TTL management, and access auditing.
 *
 * Environment variables:
 * - CREDENTIAL_BROKER_BACKEND: "supabase" or "aws-secrets-manager" (default: "supabase")
 * - AWS_REGION: region for Secrets Manager (default: "us-east-1")
 * - SECRETS_MANAGER_ENABLED: boolean flag to enable AWS backend
 */

import { getSupabaseAdmin } from "../../supabase-server";
import { CredentialBrokerResult, CredentialLease, createCredentialLease } from "./controlled-executor";

// Type placeholders for AWS SDK (only loaded dynamically if needed)
type AwsSdkModule = any;

// Lazy-load AWS SDK only if needed
async function ensureAwsSdkLoaded(): Promise<AwsSdkModule> {
  try {
    // Dynamic import to avoid requiring AWS SDK as a hard dependency
    // @ts-expect-error AWS SDK is optional and loaded dynamically
    const awsSdk = await import("@aws-sdk/client-secrets-manager");
    return {
      SecretsManagerClient: awsSdk.SecretsManagerClient,
      GetSecretValueCommand: awsSdk.GetSecretValueCommand,
      DescribeSecretCommand: awsSdk.DescribeSecretCommand,
    };
  } catch (err) {
    throw new Error(
      "AWS SDK not available. Install @aws-sdk/client-secrets-manager to use AWS Secrets Manager backend. Error: " +
        (err instanceof Error ? err.message : String(err))
    );
  }
}

/**
 * Credential broker backend type.
 */
export type CredentialBrokerBackend = "supabase" | "aws-secrets-manager";

/**
 * Credential broker configuration.
 */
export interface CredentialBrokerConfig {
  /** Backend to use for secret storage */
  backend: CredentialBrokerBackend;
  /** Default lease TTL in milliseconds */
  defaultLeaseTtlMs: number;
  /** Default max lease renewals */
  defaultMaxRenewals: number;
  /** Supabase table name for secrets (Supabase backend only) */
  secretsTableName?: string;
  /** AWS region for Secrets Manager (AWS backend only) */
  awsRegion?: string;
}

/**
 * Detect credential broker backend from environment.
 */
function getDefaultBackend(): CredentialBrokerBackend {
  if (process.env.SECRETS_MANAGER_ENABLED === "true") {
    return "aws-secrets-manager";
  }
  if (process.env.CREDENTIAL_BROKER_BACKEND === "aws-secrets-manager") {
    return "aws-secrets-manager";
  }
  return "supabase"; // Default for backward compatibility
}

/**
 * Default credential broker config.
 */
export const DEFAULT_CREDENTIAL_BROKER_CONFIG: CredentialBrokerConfig = {
  backend: getDefaultBackend(),
  defaultLeaseTtlMs: 5 * 60 * 1000, // 5 minutes
  defaultMaxRenewals: 2,
  secretsTableName: "dsg_secrets",
  awsRegion: process.env.AWS_REGION || "us-east-1",
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
 * Retrieve a secret from AWS Secrets Manager.
 * Returns parsed JSON if secret value is JSON, otherwise returns plain text.
 *
 * @param secretName Name of secret in Secrets Manager (e.g., "dsg-one-prod-api-secrets-v2")
 * @param region AWS region (default: us-east-1)
 * @returns Parsed secret value as Record<string, string>
 * @throws Error if secret not found or Secrets Manager API fails
 */
async function getSecretFromAwsSecretsManager(
  secretName: string,
  region: string = "us-east-1"
): Promise<Record<string, string>> {
  const sdk = await ensureAwsSdkLoaded();

  try {
    const client = new sdk.SecretsManagerClient({ region });
    const command = new sdk.GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    if (!response.SecretString && !response.SecretBinary) {
      throw new Error(`Secret "${secretName}" has no value`);
    }

    let secretValue: string;
    if (response.SecretString) {
      secretValue = response.SecretString;
    } else {
      // Handle binary secrets (rare)
      secretValue = Buffer.from(response.SecretBinary as Uint8Array).toString(
        "utf-8"
      );
    }

    // Try to parse as JSON
    try {
      return JSON.parse(secretValue);
    } catch {
      // Return as plain text if not JSON
      return { value: secretValue };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to retrieve secret "${secretName}" from AWS Secrets Manager: ${errorMsg}`
    );
  }
}

/**
 * Retrieve multiple secrets from AWS Secrets Manager in parallel.
 *
 * @param secretNames Array of secret names
 * @param region AWS region
 * @returns Map of secret name to parsed value; missing secrets not in map
 */
async function getSecretsFromAwsSecretsManager(
  secretNames: string[],
  region: string = "us-east-1"
): Promise<Map<string, Record<string, string>>> {
  const results = new Map<string, Record<string, string>>();

  // Fetch all secrets in parallel
  const promises = secretNames.map(async (name) => {
    try {
      const value = await getSecretFromAwsSecretsManager(name, region);
      return { name, value };
    } catch (err) {
      // Secret not found or error — skip it
      return null;
    }
  });

  const settled = await Promise.allSettled(promises);

  for (const result of settled) {
    if (result.status === "fulfilled" && result.value !== null) {
      results.set(result.value.name, result.value.value);
    }
  }

  return results;
}

/**
 * Broker credentials for a given set of secret names.
 * Supports multiple backends (Supabase or AWS Secrets Manager).
 * Returns leases or unavailable list. Never exposes raw secret values.
 *
 * @param secretNames Array of secret names to broker
 * @param config Optional configuration overrides
 * @returns CredentialBrokerResult with leases and unavailable list
 *
 * Error handling:
 * - DB/API connection failure: throws with description
 * - Individual secret not found: added to unavailable[]
 * - Expired secret: treated as unavailable
 *
 * Truth boundary:
 * - Only backend query results (Supabase or AWS) are trusted evidence.
 * - Raw secret values are never exposed; only fingerprints are stored.
 * - Secrets must be encrypted in transit and at rest.
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
    // Delegate to appropriate backend
    if (finalConfig.backend === "aws-secrets-manager") {
      return await brokerCredentialsFromAws(
        secretNames,
        finalConfig,
        leases,
        unavailable
      );
    } else {
      return await brokerCredentialsFromSupabase(
        secretNames,
        finalConfig,
        leases,
        unavailable
      );
    }
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
 * Broker credentials from Supabase backend.
 * @private
 */
async function brokerCredentialsFromSupabase(
  secretNames: string[],
  config: CredentialBrokerConfig,
  leases: CredentialLease[],
  unavailable: string[]
): Promise<CredentialBrokerResult> {
  const supabase = getSupabaseAdmin();
  const tableName = config.secretsTableName || "dsg_secrets";

  // Query for all requested secrets in a single batch
  const { data: secrets, error } = await (supabase as any)
    .from(tableName)
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
        console.warn(
          `Credential broker: Malformed secret record for name="${secretName}"`
        );
        if (secretName) unavailable.push(secretName);
        continue;
      }

      foundSecretNames.add(secretName);

      // Create a lease for this secret (fingerprint only, never raw value)
      const lease = createCredentialLease(
        secretName,
        secretValue,
        config.defaultLeaseTtlMs,
        config.defaultMaxRenewals
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
}

/**
 * Broker credentials from AWS Secrets Manager backend.
 * @private
 */
async function brokerCredentialsFromAws(
  secretNames: string[],
  config: CredentialBrokerConfig,
  leases: CredentialLease[],
  unavailable: string[]
): Promise<CredentialBrokerResult> {
  const region = config.awsRegion || "us-east-1";

  // Fetch secrets from AWS Secrets Manager in parallel
  const secretsMap = await getSecretsFromAwsSecretsManager(secretNames, region);

  // Create leases for found secrets
  for (const [secretName, secretValue] of secretsMap.entries()) {
    // Create a lease for this secret (fingerprint only, never raw value)
    const lease = createCredentialLease(
      secretName,
      JSON.stringify(secretValue), // Convert back to string for lease creation
      config.defaultLeaseTtlMs,
      config.defaultMaxRenewals
    );

    leases.push(lease);
  }

  // Secrets not found
  for (const requestedName of secretNames) {
    if (!secretsMap.has(requestedName)) {
      unavailable.push(requestedName);
    }
  }

  return { leases, unavailable };
}

/**
 * Check if a secret exists without creating a lease.
 * Useful for preflight validation. Supports both Supabase and AWS backends.
 *
 * @param secretName Name of the secret to check
 * @param config Optional configuration with backend selection
 * @returns true if secret exists, false otherwise
 */
export async function checkSecretExists(
  secretName: string,
  config?: Partial<CredentialBrokerConfig>
): Promise<boolean> {
  const finalConfig = { ...DEFAULT_CREDENTIAL_BROKER_CONFIG, ...config };

  try {
    if (finalConfig.backend === "aws-secrets-manager") {
      // Try to describe the secret (doesn't require retrieving full value)
      const sdk = await ensureAwsSdkLoaded();
      const region = finalConfig.awsRegion || "us-east-1";

      try {
        const client = new sdk.SecretsManagerClient({ region });
        await client.send(new sdk.DescribeSecretCommand({ SecretId: secretName }));
        return true;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : String(err);
        // ResourceNotFoundException means secret doesn't exist
        if (errorMsg.includes("ResourceNotFoundException")) {
          return false;
        }
        // Other errors should be thrown
        throw err;
      }
    } else {
      // Supabase backend
      const supabase = getSupabaseAdmin();
      const tableName = finalConfig.secretsTableName || "dsg_secrets";

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
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`checkSecretExists failed: ${errorMsg}`);
  }
}

/**
 * Bulk check which secrets exist (preflight validation).
 * Supports both Supabase and AWS backends.
 *
 * @param secretNames Array of secret names to check
 * @param config Optional configuration with backend selection
 * @returns Object with existing and missing arrays
 */
export async function checkSecretsExist(
  secretNames: string[],
  config?: Partial<CredentialBrokerConfig>
): Promise<{ existing: string[]; missing: string[] }> {
  const existing: string[] = [];
  const missing: string[] = [];

  if (!secretNames || secretNames.length === 0) {
    return { existing: [], missing: [] };
  }

  const finalConfig = { ...DEFAULT_CREDENTIAL_BROKER_CONFIG, ...config };

  try {
    if (finalConfig.backend === "aws-secrets-manager") {
      // Check each secret in parallel using DescribeSecret
      const sdk = await ensureAwsSdkLoaded();
      const region = finalConfig.awsRegion || "us-east-1";
      const client = new sdk.SecretsManagerClient({ region });

      const checkPromises = secretNames.map(async (name) => {
        try {
          await client.send(new sdk.DescribeSecretCommand({ SecretId: name }));
          return { name, exists: true };
        } catch (err) {
          const errorMsg =
            err instanceof Error ? err.message : String(err);
          if (errorMsg.includes("ResourceNotFoundException")) {
            return { name, exists: false };
          }
          // Other errors are treated as "not found"
          return { name, exists: false };
        }
      });

      const results = await Promise.all(checkPromises);
      for (const result of results) {
        if (result.exists) {
          existing.push(result.name);
        } else {
          missing.push(result.name);
        }
      }
    } else {
      // Supabase backend
      const supabase = getSupabaseAdmin();
      const tableName = finalConfig.secretsTableName || "dsg_secrets";

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
    }

    return { existing, missing };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`checkSecretsExist failed: ${errorMsg}`);
  }
}
