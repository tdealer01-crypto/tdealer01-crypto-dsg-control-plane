/**
 * Controlled Executor Contract for DSG Brain.
 * Enforces that execution is bound to an approved plan and credentials are leased, not exposed.
 */

import { PlanAttempt } from "./plan-attempt";
import { sha256Raw } from "./hash-utils";

/**
 * Execution grant bound to a specific planHash.
 * The grant is only valid for the approved plan.
 */
export interface ExecutionGrant {
  /** The planHash this grant is bound to */
  planHash: string;
  /** Timestamp when the grant was issued (ms since epoch) */
  issuedAt: number;
  /** Maximum lifetime of the grant in milliseconds */
  ttlMs: number;
  /** Unique grant identifier */
  grantId: string;
  /** Number of times this grant has been renewed */
  renewals: number;
  /** Maximum allowed renewals before requiring re-authorization */
  maxRenewals: number;
}

/**
 * Credential lease returned by the credential broker.
 * Contains redaction fingerprints, never raw secret values.
 */
export interface CredentialLease {
  /** Name of the secret (e.g., "ANTHROPIC_API_KEY") */
  secretName: string;
  /** Lease identifier */
  leaseId: string;
  /** Redaction fingerprint (hash of the secret value) */
  redactionFingerprint: string;
  /** Expiration timestamp (ms since epoch) */
  expiresAt: number;
  /** Whether the lease is still valid */
  valid: boolean;
  /** Number of times this lease has been renewed */
  renewals: number;
  /** Maximum allowed renewals */
  maxRenewals: number;
}

/**
 * Result from the credential broker.
 */
export interface CredentialBrokerResult {
  /** Leases issued for this execution */
  leases: CredentialLease[];
  /** Any secrets that could not be leased */
  unavailable: string[];
}

/**
 * Controlled execution context passed to the runner.
 * Contains leases, not raw key text, and is scoped to the approved plan.
 */
export interface ControlledExecutionContext {
  /** The approved plan */
  plan: PlanAttempt;
  /** Execution grant bound to the plan */
  grant: ExecutionGrant;
  /** Credential leases for required secrets */
  credentials: CredentialBrokerResult;
  /** Allowed commands (whitelist) */
  allowedCommands: string[];
  /** Allowed file paths (whitelist) */
  allowedPaths: string[];
}

/**
 * Command that the runner intends to execute.
 */
export interface ProposedCommand {
  command: string;
  args: string[];
}

/**
 * File change that the runner intends to make.
 */
export interface ProposedFileChange {
  path: string;
  operation: "write" | "delete" | "append";
}

/**
 * Result of a controlled execution.
 */
export interface ControlledExecutionResult {
  /** Whether execution completed within constraints */
  success: boolean;
  /** Plan hash that was executed */
  planHash: string;
  /** Commands that were actually executed */
  executedCommands: ProposedCommand[];
  /** File changes that were actually made */
  fileChanges: ProposedFileChange[];
  /** Evidence collected during execution */
  evidence: ExecutionEvidence[];
  /** Block reason if execution was blocked */
  blockReason?: string;
}

/**
 * Evidence collected during execution.
 */
export interface ExecutionEvidence {
  type: "command" | "file" | "log" | "artifact";
  id: string;
  hash: string;
  timestamp: number;
}

/**
 * Build an execution grant bound to a specific plan.
 */
export function buildExecutionGrant(
  plan: PlanAttempt,
  ttlMs: number = 5 * 60 * 1000, // 5 minutes default
  maxRenewals: number = 2
): ExecutionGrant {
  return {
    planHash: plan.planHash,
    issuedAt: Date.now(),
    ttlMs,
    grantId: `grant-${plan.planHash.slice(0, 16)}-${Date.now()}`,
    renewals: 0,
    maxRenewals,
  };
}

/**
 * Renew an execution grant, extending its lifetime.
 * Requires the grant to be valid and not exceed maxRenewals.
 * Returns a new grant object; original is not mutated.
 */
export function renewExecutionGrant(
  grant: ExecutionGrant,
  plan: PlanAttempt,
  additionalTtlMs: number = 5 * 60 * 1000
): ExecutionGrant {
  if (!isGrantValid(grant, plan)) {
    throw new Error("CONFORMANCE BLOCK: Cannot renew invalid or expired grant");
  }
  if (grant.renewals >= grant.maxRenewals) {
    throw new Error(
      `CONFORMANCE BLOCK: Grant exceeded max renewals (${grant.maxRenewals}). Re-authorization required.`
    );
  }
  return {
    ...grant,
    issuedAt: Date.now(),
    ttlMs: additionalTtlMs,
    renewals: grant.renewals + 1,
    grantId: `${grant.grantId}-renewed-${grant.renewals + 1}`,
  };
}

/**
 * Check if a grant is still valid (not expired and matches plan).
 * Includes a grace period to prevent mid-execution expiry race conditions.
 */
export function isGrantValid(
  grant: ExecutionGrant,
  plan: PlanAttempt,
  gracePeriodMs: number = 0
): boolean {
  const now = Date.now();
  // Expiration time is when TTL runs out
  const expiresAt = grant.issuedAt + grant.ttlMs;
  // Grace period: allow a grace period after expiration to prevent race conditions
  const expired = now > expiresAt + gracePeriodMs;
  const planMatch = grant.planHash === plan.planHash;
  return !expired && planMatch;
}

/**
 * Build a controlled execution context.
 * This is the only way to create a context; raw secrets are never included.
 */
export function buildControlledExecutionContext(
  plan: PlanAttempt,
  allowedCommands: string[],
  allowedPaths: string[],
  credentials: CredentialBrokerResult,
  ttlMs?: number,
  maxRenewals?: number
): ControlledExecutionContext {
  const grant = buildExecutionGrant(plan, ttlMs, maxRenewals);
  return {
    plan,
    grant,
    credentials,
    allowedCommands,
    allowedPaths,
  };
}

/**
 * Create a credential lease for a secret name.
 * The actual secret value is never stored in the lease.
 */
export function createCredentialLease(
  secretName: string,
  secretValue: string,
  ttlMs: number = 5 * 60 * 1000,
  maxRenewals: number = 2
): CredentialLease {
  return {
    secretName,
    leaseId: `lease-${secretName}-${Date.now()}`,
    redactionFingerprint: sha256Raw(secretValue),
    expiresAt: Date.now() + ttlMs,
    valid: true,
    renewals: 0,
    maxRenewals,
  };
}

/**
 * Renew a credential lease, extending its expiration.
 * Returns a new lease object; original is not mutated.
 */
export function renewCredentialLease(
  lease: CredentialLease,
  additionalTtlMs: number = 5 * 60 * 1000
): CredentialLease {
  if (!isLeaseValid(lease)) {
    throw new Error("CONFORMANCE BLOCK: Cannot renew invalid or expired lease");
  }
  if (lease.renewals >= lease.maxRenewals) {
    throw new Error(
      `CONFORMANCE BLOCK: Lease exceeded max renewals (${lease.maxRenewals}). Re-authorization required.`
    );
  }
  return {
    ...lease,
    expiresAt: Date.now() + additionalTtlMs,
    renewals: lease.renewals + 1,
    leaseId: `${lease.leaseId}-renewed-${lease.renewals + 1}`,
  };
}

/**
 * Check if a credential lease is still valid.
 * Includes a grace period to prevent mid-execution expiry race conditions.
 */
export function isLeaseValid(
  lease: CredentialLease,
  gracePeriodMs: number = 0
): boolean {
  if (!lease.valid) return false;
  const now = Date.now();
  const expiredMs = now - lease.expiresAt;
  // Lease is valid if not expired yet, OR if expired within grace period
  return expiredMs <= gracePeriodMs;
}
