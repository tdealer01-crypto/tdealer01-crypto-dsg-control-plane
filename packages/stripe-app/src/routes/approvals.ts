/**
 * Approvals Router
 *
 * Handles approval workflow for operations requiring review.
 * Merchants/operators can approve or reject pending operations.
 */

import { Hono } from 'hono';

const router = new Hono();

/**
 * GET /stripe/approvals/pending
 *
 * List all pending approvals for a Stripe account
 *
 * Query params:
 * - stripe_account_id (required)
 * - status (optional): pending, approved, rejected
 * - limit (optional): default 50
 * - offset (optional): default 0
 */
router.get('/pending', async (c) => {
  try {
    const { stripe_account_id, status, limit = '50', offset = '0' } = c.req.query();

    if (!stripe_account_id) {
      return c.json({ error: 'Missing stripe_account_id' }, 400);
    }

    // TODO: Query stripe_operation_approvals from Supabase
    // TODO: Filter by status if provided
    // TODO: Include approval_url and decision_id
    // TODO: Support pagination
    // TODO: Sort by created_at descending

    return c.json(
      {
        approvals: [],
        total: 0,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      },
      200
    );
  } catch (err) {
    console.error('Get pending approvals error:', err);
    return c.json({ error: 'Failed to retrieve pending approvals' }, 500);
  }
});

/**
 * POST /stripe/approvals/{decision_id}/approve
 *
 * Approve a pending operation
 *
 * Request body:
 * {
 *   "reason": "Approved by ops team",
 *   "approved_by": "user@example.com"
 * }
 */
router.post('/:decision_id/approve', async (c) => {
  try {
    const { decision_id } = c.req.param();
    const { reason, approved_by } = await c.req.json<{ reason?: string; approved_by?: string }>();

    if (!decision_id) {
      return c.json({ error: 'Missing decision_id' }, 400);
    }

    // TODO: Fetch approval record from Supabase
    // TODO: Verify approval is in pending status
    // TODO: Update approval status to approved
    // TODO: Call DSG gateway executor to proceed with operation
    // TODO: Record audit log with approval details
    // TODO: Return updated approval

    return c.json(
      {
        success: true,
        decision_id,
        status: 'approved',
        approved_at: new Date().toISOString(),
      },
      200
    );
  } catch (err) {
    console.error('Approve operation error:', err);
    return c.json({ error: 'Failed to approve operation' }, 500);
  }
});

/**
 * POST /stripe/approvals/{decision_id}/reject
 *
 * Reject a pending operation
 *
 * Request body:
 * {
 *   "reason": "Rejected due to policy violation",
 *   "rejected_by": "user@example.com"
 * }
 */
router.post('/:decision_id/reject', async (c) => {
  try {
    const { decision_id } = c.req.param();
    const { reason, rejected_by } = await c.req.json<{ reason?: string; rejected_by?: string }>();

    if (!decision_id) {
      return c.json({ error: 'Missing decision_id' }, 400);
    }

    // TODO: Fetch approval record from Supabase
    // TODO: Verify approval is in pending status
    // TODO: Update approval status to rejected
    // TODO: Block the original Stripe operation
    // TODO: Record audit log with rejection details
    // TODO: Return updated approval

    return c.json(
      {
        success: true,
        decision_id,
        status: 'rejected',
        rejected_at: new Date().toISOString(),
      },
      200
    );
  } catch (err) {
    console.error('Reject operation error:', err);
    return c.json({ error: 'Failed to reject operation' }, 500);
  }
});

/**
 * GET /stripe/approvals/{decision_id}
 *
 * Get details of a specific approval
 */
router.get('/:decision_id', async (c) => {
  try {
    const { decision_id } = c.req.param();

    if (!decision_id) {
      return c.json({ error: 'Missing decision_id' }, 400);
    }

    // TODO: Query single approval with full details
    // TODO: Include linked stripe_operation_audits
    // TODO: Include DSG decision metadata

    return c.json({ approval: null }, 200);
  } catch (err) {
    console.error('Get approval detail error:', err);
    return c.json({ error: 'Failed to retrieve approval' }, 500);
  }
});

export default router;
