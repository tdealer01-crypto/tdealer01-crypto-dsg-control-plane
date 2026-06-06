/**
 * Custom UI Actions Router
 *
 * Handles pre-execution gates for custom UI actions in Stripe Dashboard.
 * When a merchant clicks a DSG-controlled button (e.g., "Create Charge with Approval"),
 * the request comes through this router for policy evaluation before proceeding.
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
 *   "params": { ... Stripe API params ... }
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
    const { stripe_account_id, action, params } = await c.req.json();

    if (!stripe_account_id || !action) {
      return c.json({ error: 'Missing stripe_account_id or action' }, 400);
    }

    // TODO: Check if stripe_account_id is linked to a DSG org
    // TODO: Fetch policies from Redis cache
    // TODO: Evaluate policies against the action
    // TODO: Call DSG gateway executor for REVIEW/BLOCK decisions
    // TODO: If ALLOW: execute the Stripe API call
    // TODO: Return decision + optional approval_url

    return c.json(
      {
        decision: 'ALLOW',
        reason: 'Action allowed by policy',
      },
      200
    );
  } catch (err) {
    console.error('Custom UI execute error:', err);
    return c.json({ error: 'Execution failed' }, 500);
  }
});

export default router;
