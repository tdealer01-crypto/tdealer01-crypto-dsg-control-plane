/**
 * Delegation Service
 *
 * Manages loading, validating, and checking delegation contracts.
 */

import type { DelegationContract, DelegationValidationResult } from './types';

/**
 * Load a delegation contract from the database by ID.
 *
 * @param delegationId - The delegation ID to load
 * @returns The delegation contract, or null if not found
 */
export async function loadDelegation(delegationId: string): Promise<DelegationContract | null> {
  try {
    // This would normally fetch from Supabase, but for now we provide the interface
    // The actual implementation will use the Supabase client
    if (!delegationId || typeof delegationId !== 'string') {
      return null;
    }

    // Placeholder for actual DB call
    return null;
  } catch (error) {
    console.error(`Failed to load delegation ${delegationId}:`, error);
    return null;
  }
}

/**
 * Validate a delegation contract for correctness and completeness.
 *
 * Checks:
 * - Required fields are present
 * - expiresAt is a valid ISO8601 date
 * - Expiration date is in the future
 * - No duplicate entries in allowedActions/blockedActions
 * - Action lists are not contradictory
 *
 * @param delegation - The delegation to validate
 * @returns Validation result with errors and warnings
 */
export function validateDelegation(delegation: DelegationContract): DelegationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!delegation.delegationId) {
    errors.push('delegationId is required');
  }
  if (!delegation.orgId) {
    errors.push('orgId is required');
  }
  if (!delegation.userId) {
    errors.push('userId is required');
  }
  if (!delegation.goal || typeof delegation.goal !== 'string') {
    errors.push('goal is required and must be a string');
  }
  if (!delegation.scope || typeof delegation.scope !== 'string') {
    errors.push('scope is required and must be a string');
  }
  if (!Array.isArray(delegation.allowedActions)) {
    errors.push('allowedActions must be an array');
  }
  if (!Array.isArray(delegation.blockedActions)) {
    errors.push('blockedActions must be an array');
  }
  if (!Array.isArray(delegation.requiresUserConfirm)) {
    errors.push('requiresUserConfirm must be an array');
  }

  // Check expiresAt is valid
  if (!delegation.expiresAt || typeof delegation.expiresAt !== 'string') {
    errors.push('expiresAt is required and must be an ISO8601 string');
  } else {
    try {
      const expiresDate = new Date(delegation.expiresAt);
      if (isNaN(expiresDate.getTime())) {
        errors.push('expiresAt is not a valid ISO8601 date');
      }
    } catch {
      errors.push('expiresAt is not a valid ISO8601 date');
    }
  }

  // Check for contradictions in action lists
  if (Array.isArray(delegation.allowedActions) && Array.isArray(delegation.blockedActions)) {
    const allowed = new Set(delegation.allowedActions);
    const blocked = new Set(delegation.blockedActions);

    for (const action of allowed) {
      if (blocked.has(action)) {
        errors.push(`Action "${action}" is in both allowedActions and blockedActions`);
      }
    }

    // Check for duplicates
    if (new Set(delegation.allowedActions).size !== delegation.allowedActions.length) {
      warnings.push('allowedActions contains duplicates');
    }
    if (new Set(delegation.blockedActions).size !== delegation.blockedActions.length) {
      warnings.push('blockedActions contains duplicates');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Quick boolean check: is a delegation valid for use?
 *
 * Returns false if:
 * - Validation fails
 * - Delegation has expired
 * - Required fields are missing
 *
 * @param delegation - The delegation to check
 * @returns true if the delegation is valid and not expired
 */
export function isDelegationValid(delegation: DelegationContract | null): boolean {
  if (!delegation) {
    return false;
  }

  // Check validation
  const validation = validateDelegation(delegation);
  if (!validation.valid) {
    return false;
  }

  // Check expiration
  try {
    const expiresDate = new Date(delegation.expiresAt);
    const now = new Date();
    if (expiresDate <= now) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

/**
 * Get the time remaining until a delegation expires.
 *
 * @param delegation - The delegation to check
 * @returns Milliseconds until expiration, or null if expired/invalid
 */
export function getTimeUntilExpiration(delegation: DelegationContract | null): number | null {
  if (!delegation) {
    return null;
  }

  try {
    const expiresDate = new Date(delegation.expiresAt);
    const now = new Date();
    const remaining = expiresDate.getTime() - now.getTime();

    return remaining > 0 ? remaining : null;
  } catch {
    return null;
  }
}
