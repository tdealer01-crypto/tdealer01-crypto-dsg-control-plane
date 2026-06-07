/**
 * Custom UI Actions Router
 *
 * Handles pre-execution gates for custom UI actions in Stripe Dashboard.
 * When a merchant clicks a DSG-controlled button (e.g., "Create Charge with Approval"),
 * the request comes through this router for policy evaluation before proceeding.
 *
 * Performance target: <2s policy evaluation (Stripe UI timeout)
 * Uses Redis cache for policy lookups to avoid Supabase query bottleneck.
 */

import { Hono } from 'hono';
import { createLogger, generateRequestId } from '../lib/logger';
import { ValidationError, createSafeErrorResponse } from '../lib/error-handler';

const router = new Hono();

/**
 * POST /stripe/custom-ui/execute
 *
 * Pre-execution gate for Stripe operations initiated via custom UI actions.
 *
 * Request body:
 * {
 *   "stripe_account_id": "acct_...",
 *   "action": "charge.create" | "refund.create" | "payout.create",
 *   "params": {
 *     "amount": 10000,
 *     "currency": "usd",
 *     ...other Stripe API params
 *   }
 * }
 *
 * Response:
 * {
 *   "decision": "ALLOW" | "BLOCK" | "REVIEW",
 *   "reason": "...",
 *   "proof_hash": "...",
 *   "approval_id": "..." (if REVIEW),
 *   "approval_url": "..." (if REVIEW),
 *   "evaluation_time_ms": <number>
 * }
 *
 * Performance target: <2 seconds
 */
router.post('/execute', async (c) => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, endpoint: 'POST /custom-ui/execute' });

  try {
    logger.logApiRequest('POST', '/custom-ui/execute');

    const body = await c.req.json<{
      stripe_account_id?: string;
      action?: string;
      params?: Record<string, unknown>;
    }>();

    const { stripe_account_id, action, params } = body;

    // Validate required fields
    if (!stripe_account_id) {
      logger.warn('Missing stripe_account_id', { action });
      throw new ValidationError('Missing stripe_account_id');
    }

    if (!action) {
      logger.warn('Missing action', { stripe_account_id });
      throw new ValidationError('Missing action');
    }

    logger.info('Evaluating custom UI action', {
      stripeAccountId: stripe_account_id,
      action,
    });

    // Parse action type and operation type from action string
    // Format: "operation.type" or "stripe.operation.action"
    const operationType = parseOperationType(action);
    const amount = extractAmount(params);

    logger.debug('Parsed action', {
      operationType,
      amount,
    });

    // TODO: Check if stripe_account_id is linked to a DSG org (Supabase query)
    // const stateManager = new StripeStateManager(
    //   process.env.SUPABASE_URL!,
    //   process.env.SUPABASE_SERVICE_ROLE_KEY!
    // );
    // const account = await stateManager.getStripeAccount(stripe_account_id);
    // if (!account || account.status !== 'active') {
    //   throw new NotFoundError('Stripe account');
    // }

    // TODO: Fetch policies from cache with timeout
    // const cachedPolicy = policyCache.get(stripe_account_id, operationType);
    // let policy = cachedPolicy;
    // if (!policy) {
    //   policy = await stateManager.getPolicy(stripe_account_id, operationType);
    //   if (policy) {
    //     policyCache.set(stripe_account_id, operationType, policy);
    //   }
    // }

    // TODO: Evaluate policies with <2s timeout
    // const evaluationStartTime = Date.now();
    // const evaluationPromise = evaluateStripePolicies({
    //   stripe_account_id,
    //   operation_type: operationType as any,
    //   amount_cents: amount,
    //   currency: params?.currency as string || 'usd',
    // }, policy ? [policy] : []);

    // Enforce 2s timeout for policy evaluation
    // const timeoutPromise = new Promise((_, reject) =>
    //   setTimeout(() => reject(new Error('Policy evaluation timeout')), 2000)
    // );

    // let evaluation;
    // try {
    //   evaluation = await Promise.race([evaluationPromise, timeoutPromise]);
    // } catch (err) {
    //   logger.warn('Policy evaluation timeout or failed', { error: err instanceof Error ? err.message : 'Unknown' });
    //   // Timeout: default to REVIEW (safest for governance)
    //   evaluation = {
    //     decision: 'review' as const,
    //     reason: 'Policy evaluation timed out',
    //   };
    // }

    // Stub implementation for now
    const evaluation = {
      decision: 'ALLOW' as const,
      reason: 'Action allowed by policy',
      proof_hash: generateProofHash(action, params),
    };

    // TODO: Call DSG gateway executor for governance record
    // if (evaluation.decision !== 'ALLOW') {
    //   const dsgRequest = chargeToGatewayRequest(
    //     { ...params, id: generateRequestId() } as any,
    //     stripe_account_id,
    //     requestId
    //   );
    //   const dsgDecision = await evaluateGateway(dsgRequest, process.env.DSG_API_BASE!);
    // }

    // TODO: Create approval record if REVIEW
    // let approvalUrl: string | undefined;
    // if (evaluation.decision === 'REVIEW') {
    //   const approval = await stateManager.recordAudit(
    //     stripe_account_id,
    //     requestId,
    //     requestId,
    //     operationType,
    //     'REVIEW',
    //     evaluation.reason,
    //     evaluation.proof_hash,
    //     params
    //   );
    //   approvalUrl = `${process.env.API_BASE_URL}/api/stripe/approvals/${approval.id}`;
    // }

    const elapsedTime = Date.now() - startTime;

    logger.info('Custom UI action evaluated', {
      decision: evaluation.decision,
      elapsedTime,
    });

    // Return decision with proof hash for audit trail
    const response = {
      decision: evaluation.decision,
      reason: evaluation.reason,
      proof_hash: evaluation.proof_hash,
      evaluation_time_ms: elapsedTime,
    };

    // Add approval details if REVIEW
    if (evaluation.decision === 'REVIEW') {
      Object.assign(response, {
        // approval_id: approval?.id,
        // approval_url: approvalUrl,
      });
    }

    return c.json(response, 200);
  } catch (err) {
    const elapsedTime = Date.now() - startTime;
    logger.error('Custom UI execute error', err, { elapsedTime });

    const isDevelopment = process.env.NODE_ENV === 'development';
    const safeResponse = createSafeErrorResponse(err, isDevelopment, requestId);

    const statusCode =
      err instanceof ValidationError ? 400 : 500;

    return c.json(safeResponse, statusCode);
  }
});

/**
 * Parse operation type from action string
 * Examples: "charge.create" -> "charge", "stripe.payout.create" -> "payout"
 */
function parseOperationType(action: string): string {
  const parts = action.split('.');
  if (parts.length === 2) {
    return parts[0];
  }
  if (parts.length === 3) {
    return parts[1];
  }
  return action;
}

/**
 * Extract amount from params
 */
function extractAmount(params?: Record<string, unknown>): number | undefined {
  if (!params) return undefined;

  // Try common amount field names
  const amountValue = params.amount || params.amount_cents || params.amount_usd;
  if (typeof amountValue === 'number') {
    return amountValue;
  }

  return undefined;
}

/**
 * Generate a deterministic proof hash for the action
 * This is used for audit trail and compliance
 */
function generateProofHash(action: string, params?: Record<string, unknown>): string {
  const data = `${action}:${JSON.stringify(params || {})}`;
  // Simple hash - in production, use crypto.subtle.digest('SHA-256', ...)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `ph_${Math.abs(hash).toString(16)}`;
}

export default router;
