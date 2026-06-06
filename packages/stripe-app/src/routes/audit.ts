/**
 * Audit Router
 *
 * Provides access to operation audit trails linking Stripe events to DSG decisions.
 */

import { Hono } from 'hono';

const router = new Hono();

/**
 * GET /stripe/audit/operations
 *
 * List audited Stripe operations with their governance decisions.
 *
 * Query params:
 * - stripe_account_id (required)
 * - start_date (optional)
 * - end_date (optional)
 * - operation_type (optional): charge, refund, payout
 * - decision (optional): ALLOW, BLOCK, REVIEW
 */
router.get('/operations', async (c) => {
  try {
    const { stripe_account_id, start_date, end_date, operation_type, decision } = c.req.query();

    if (!stripe_account_id) {
      return c.json({ error: 'Missing stripe_account_id' }, 400);
    }

    // TODO: Query stripe_operation_audits from Supabase
    // TODO: Apply filters for date range, operation type, decision
    // TODO: Include DSG decision_id and reason
    // TODO: Paginate results

    return c.json({ operations: [], total: 0, page: 1 }, 200);
  } catch (err) {
    console.error('Get operations error:', err);
    return c.json({ error: 'Failed to retrieve operations' }, 500);
  }
});

/**
 * GET /stripe/audit/operations/:operation_id
 * Get details of a specific operation
 */
router.get('/operations/:operation_id', async (c) => {
  try {
    const { operation_id } = c.req.param();

    // TODO: Query single operation with full Stripe payload and DSG decision
    // TODO: Include linked dsg_governance_decision_events

    return c.json({ operation: null }, 200);
  } catch (err) {
    console.error('Get operation detail error:', err);
    return c.json({ error: 'Failed to retrieve operation' }, 500);
  }
});

export default router;
