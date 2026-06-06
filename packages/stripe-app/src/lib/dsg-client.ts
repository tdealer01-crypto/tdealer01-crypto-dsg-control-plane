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

export interface GatewayRequest {
  action: string;
  operation_type: string;
  context: {
    stripe_account_id: string;
    stripe_event_id: string;
    object_type: string;
    object_id: string;
    amount_cents: number;
    currency: string;
    customer_id?: string;
    metadata?: Record<string, string>;
  };
}

export interface GatewayResponse {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason?: string;
  proof?: string;
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

/**
 * Evaluate a gateway request against DSG policies.
 * Includes timeout handling and fail-safe defaults.
 *
 * @param request - Gateway request with Stripe operation context
 * @param apiBase - DSG API base URL
 * @returns Gateway decision (ALLOW/BLOCK/REVIEW)
 */
export async function evaluateGateway(
  request: GatewayRequest,
  apiBase: string
): Promise<GatewayResponse> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${apiBase}/api/stripe-app/gateway/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });

    if (!response.ok) {
      throw new Error(`Gateway evaluation failed: ${response.statusText}`);
    }

    const decision = await response.json();
    const duration = Date.now() - startTime;

    console.log(
      `[Gateway] Decision for ${request.action}: ${decision.decision} (${duration}ms)`
    );

    return decision;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[Gateway] Evaluation error after ${duration}ms:`,
      error instanceof Error ? error.message : 'Unknown error'
    );

    // Fail-safe: default to REVIEW (safest default for governance)
    return {
      decision: 'REVIEW',
      reason: `Gateway evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Record a gateway decision to the audit trail.
 *
 * @param decision - Gateway decision
 * @param stripeEventId - Stripe event ID
 * @param apiBase - DSG API base URL
 */
export async function recordAudit(
  decision: GatewayResponse,
  stripeEventId: string,
  apiBase: string
): Promise<void> {
  try {
    await fetch(`${apiBase}/api/stripe-app/audit/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stripe_event_id: stripeEventId,
        decision,
      }),
    });
  } catch (error) {
    console.error(
      '[Audit] Failed to record decision:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    // Don't throw - audit failure shouldn't block main flow
  }
}

export const dsgClient = initDsgClient();
