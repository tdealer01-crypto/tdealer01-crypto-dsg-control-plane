/**
 * DSG Client
 *
 * Wraps the DSG SDK with Stripe-specific context and helpers.
 * Provides simplified APIs for gateway checks, policy evaluation, and decision recording.
 */

export interface StripeOperationRequest {
  stripe_account_id: string;
  action: 'charge.create' | 'refund.create' | 'payout.create' | string;
  amount_cents?: number;
  currency?: string;
  context?: Record<string, unknown>;
}

export interface StripeOperationDecision {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason: string;
  policy_id?: string;
  approval_id?: string;
  approval_url?: string;
}

/**
 * Initialize DSG client with API key.
 * Called once at app startup.
 */
export function initDsgClient() {
  const apiKey = process.env.DSG_API_KEY;
  if (!apiKey) {
    throw new Error('DSG_API_KEY is required');
  }

  // TODO: Initialize actual DSG SDK client
  // For now, return a placeholder

  return {
    apiKey,
    ready: true,
  };
}

/**
 * Check a Stripe operation against DSG governance policies.
 *
 * @param request - Stripe operation details
 * @returns Decision (ALLOW/BLOCK/REVIEW) + reason
 */
export async function gatewayCheckStripeOperation(
  request: StripeOperationRequest
): Promise<StripeOperationDecision> {
  // TODO: Implement gateway check
  // 1. Fetch policies from cache (Redis)
  // 2. Evaluate policies against request
  // 3. Call DSG gateway executor if needed
  // 4. Return decision

  return {
    decision: 'ALLOW',
    reason: 'Operation allowed by policy',
  };
}

/**
 * Record a Stripe operation decision to the governance audit trail.
 *
 * @param stripeEventId - Stripe webhook event ID
 * @param stripeObjectId - Stripe charge/payout/refund ID
 * @param operationType - Type of operation
 * @param decision - DSG decision (ALLOW/BLOCK/REVIEW)
 * @param dsgDecisionId - ID of DSG decision record
 */
export async function recordStripeDecision(
  stripeEventId: string,
  stripeObjectId: string,
  operationType: string,
  decision: string,
  dsgDecisionId?: string
): Promise<void> {
  // TODO: Insert into stripe_operation_audits table
  // Links Stripe event to DSG decision for compliance evidence
}

/**
 * Get current fail-safe mode for a Stripe account.
 *
 * @param stripeAccountId - Stripe account ID
 * @returns 'open' (allow on failure) or 'closed' (block on failure)
 */
export async function getFailSafeMode(stripeAccountId: string): Promise<'open' | 'closed'> {
  // TODO: Query stripe_app_accounts for fail_safe_mode
  return 'open'; // default
}

export const dsgClient = initDsgClient();
