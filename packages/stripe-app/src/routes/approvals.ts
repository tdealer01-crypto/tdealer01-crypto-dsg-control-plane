/**
 * Approvals Router
 *
 * Handles approval workflow for operations requiring review.
 * Merchants/operators can approve or reject pending operations.
 */

import { Hono } from 'hono';
import { getSupabase } from '../lib/dsg-client';

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

    const supabase = getSupabase();
    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    const offsetNum = parseInt(offset, 10) || 0;

    let query = supabase
      .from('stripe_operation_audits')
      .select('*', { count: 'exact' })
      .eq('stripe_account_id', stripe_account_id)
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    // Filter by status if provided
    if (status) {
      query = query.eq('dsg_decision', status.toUpperCase());
    } else {
      // Default to REVIEW status (pending)
      query = query.eq('dsg_decision', 'REVIEW');
    }

    const { data: approvals, count, error } = await query;

    if (error) {
      console.error('Get pending approvals error:', error);
      return c.json({ error: 'Failed to retrieve pending approvals' }, 500);
    }

    return c.json(
      {
        approvals: approvals || [],
        total: count || 0,
        limit: limitNum,
        offset: offsetNum,
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
    const body = await c.req.json<{ reason?: string; approved_by?: string }>();

    if (!decision_id) {
      return c.json({ error: 'Missing decision_id' }, 400);
    }

    const { reason, approved_by } = body;
    const supabase = getSupabase();

    // Fetch approval record from Supabase
    const { data: audit, error: fetchError } = await supabase
      .from('stripe_operation_audits')
      .select('*')
      .eq('stripe_event_id', decision_id)
      .single();

    if (fetchError || !audit) {
      return c.json({ error: 'Approval not found' }, 404);
    }

    // Verify approval is in pending status
    if (audit.dsg_decision !== 'REVIEW') {
      return c.json({ error: 'Approval is not in pending status' }, 400);
    }

    // Update approval status to approved
    const { data: updated, error: updateError } = await supabase
      .from('stripe_operation_audits')
      .update({
        status: 'reviewed',
        dsg_decision: 'ALLOW',
        dsg_reason: reason || 'Approved by operator',
        payload: {
          ...audit.payload,
          approved_by,
          approved_at: new Date().toISOString(),
        },
      })
      .eq('stripe_event_id', decision_id)
      .select()
      .single();

    if (updateError) {
      console.error('Approve operation error:', updateError);
      return c.json({ error: 'Failed to approve operation' }, 500);
    }

    return c.json(
      {
        success: true,
        decision_id,
        status: 'approved',
        approved_at: new Date().toISOString(),
        audit: updated,
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
    const body = await c.req.json<{ reason?: string; rejected_by?: string }>();

    if (!decision_id) {
      return c.json({ error: 'Missing decision_id' }, 400);
    }

    const { reason, rejected_by } = body;
    const supabase = getSupabase();

    // Fetch approval record from Supabase
    const { data: audit, error: fetchError } = await supabase
      .from('stripe_operation_audits')
      .select('*')
      .eq('stripe_event_id', decision_id)
      .single();

    if (fetchError || !audit) {
      return c.json({ error: 'Approval not found' }, 404);
    }

    // Verify approval is in pending status
    if (audit.dsg_decision !== 'REVIEW') {
      return c.json({ error: 'Approval is not in pending status' }, 400);
    }

    // Update approval status to rejected
    const { data: updated, error: updateError } = await supabase
      .from('stripe_operation_audits')
      .update({
        status: 'reviewed',
        dsg_decision: 'BLOCK',
        dsg_reason: reason || 'Rejected by operator',
        payload: {
          ...audit.payload,
          rejected_by,
          rejected_at: new Date().toISOString(),
        },
      })
      .eq('stripe_event_id', decision_id)
      .select()
      .single();

    if (updateError) {
      console.error('Reject operation error:', updateError);
      return c.json({ error: 'Failed to reject operation' }, 500);
    }

    return c.json(
      {
        success: true,
        decision_id,
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        audit: updated,
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

    const supabase = getSupabase();

    // Query single approval with full details
    const { data: audit, error } = await supabase
      .from('stripe_operation_audits')
      .select('*')
      .eq('stripe_event_id', decision_id)
      .single();

    if (error || !audit) {
      return c.json({ error: 'Approval not found' }, 404);
    }

    return c.json(
      {
        approval: audit,
        stripe_event_id: audit.stripe_event_id,
        status: audit.status,
        decision: audit.dsg_decision,
        reason: audit.dsg_reason,
      },
      200
    );
  } catch (err) {
    console.error('Get approval detail error:', err);
    return c.json({ error: 'Failed to retrieve approval' }, 500);
  }
});

export default router;
