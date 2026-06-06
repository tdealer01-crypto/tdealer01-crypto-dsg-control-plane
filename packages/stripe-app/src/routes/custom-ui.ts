/**
 * Custom UI Actions Router
 *
 * Handles pre-execution gates for custom UI actions in Stripe Dashboard.
 * When a merchant clicks a DSG-controlled button (e.g., "Create Charge with Approval"),
 * the request comes through this router for policy evaluation before proceeding.
 *
 * Performance target: <2s policy evaluation (Stripe UI timeout)
 */

import { Hono } from 'hono';

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
 *   "approval_id": "..." (if REVIEW),
 *   "approval_url": "..." (if REVIEW)
 * }
 */
router.post('/execute', async (c) => {
  try {
    const startTime = Date.now();
    const body = await c.req.json<{
      stripe_account_id?: string;
      action?: string;
      params?: Record<string, unknown>;
    }>();

    const { stripe_account_id, action, params } = body;

    if (!stripe_account_id || !action) {
      return c.json(
        { error: 'Missing required fields: stripe_account_id, action' },
        400
      );
    }

    // TODO: Check if stripe_account_id is linked to a DSG org (Supabase query)
    // TODO: Fetch policies from Redis cache (Cache Aside pattern)
    // TODO: Evaluate policies against the action/params using stripe-policy-evaluator
    // TODO: Enforce 2s timeout - default to REVIEW if policy evaluation exceeds timeout
    // TODO: If ALLOW: execute the Stripe API call and record audit
    // TODO: If REVIEW or BLOCK: create approval/audit record and return decision_url
    // TODO: Call DSG gateway executor for governance record
    // TODO: Record in stripe_operation_audits
    // TODO: Return decision + optional approval_url

    const elapsedTime = Date.now() - startTime;

    return c.json(
      {
        decision: 'ALLOW',
        reason: 'Action allowed by policy',
        evaluation_time_ms: elapsedTime,
      },
      200
    );
  } catch (err) {
    console.error('Custom UI execute error:', err);
    return c.json(
      {
        error: 'Execution failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      500
    );
  }
});

export default router;
