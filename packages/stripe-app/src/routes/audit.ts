/**
 * Audit Router
 *
 * Provides access to operation audit trails linking Stripe events to DSG decisions.
 * Used for compliance reporting and operational visibility.
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
 * - start_date (optional): ISO 8601 date string
 * - end_date (optional): ISO 8601 date string
 * - operation_type (optional): charge, refund, payout
 * - decision (optional): ALLOW, BLOCK, REVIEW
 * - limit (optional): default 50, max 500
 * - offset (optional): default 0
 */
router.get('/operations', async (c) => {
  try {
    const {
      stripe_account_id,
      start_date,
      end_date,
      operation_type,
      decision,
      limit = '50',
      offset = '0',
    } = c.req.query();

    if (!stripe_account_id) {
      return c.json({ error: 'Missing stripe_account_id' }, 400);
    }

    const limitNum = Math.min(parseInt(limit, 10), 500);
    const offsetNum = parseInt(offset, 10);

    // Query stripe_operation_audits from Supabase
    // Import supabaseAdmin from dsg-rpc.ts
    const { supabaseAdmin } = await import('../lib/dsg-rpc');

    if (!supabaseAdmin) {
      return c.json({ error: 'Database not configured' }, 500);
    }

    let query = supabaseAdmin
      .from('stripe_operation_audits')
      .select(
        'id, stripe_event_id, operation_type, stripe_object_id, dsg_decision, dsg_reason, dsg_proof, payload, created_at, chain_index',
        { count: 'exact' }
      )
      .eq('stripe_account_id', stripe_account_id)
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }
    if (operation_type) {
      query = query.eq('operation_type', operation_type);
    }
    if (decision) {
      query = query.eq('dsg_decision', decision);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('Audit query error:', error);
      return c.json({ error: 'Failed to retrieve operations' }, 500);
    }

    return c.json(
      {
        operations: data || [],
        total: count || 0,
        limit: limitNum,
        offset: offsetNum,
        stripe_account_id,
      },
      200
    );
  } catch (err) {
    console.error('Get operations error:', err);
    return c.json({ error: 'Failed to retrieve operations' }, 500);
  }
});

/**
 * GET /stripe/audit/operations/{operation_id}
 * Get details of a specific operation
 *
 * Returns full audit record including:
 * - Original Stripe event payload
 * - DSG governance decision
 * - Policy evaluation result
 * - Approval workflow (if any)
 */
router.get('/operations/:operation_id', async (c) => {
  try {
    const { operation_id } = c.req.param();

    if (!operation_id) {
      return c.json({ error: 'Missing operation_id' }, 400);
    }

    const { supabaseAdmin } = await import('../lib/dsg-rpc');

    if (!supabaseAdmin) {
      return c.json({ error: 'Database not configured' }, 500);
    }

    const { data, error } = await supabaseAdmin
      .from('stripe_operation_audits')
      .select('*')
      .eq('id', operation_id)
      .single();

    if (error) {
      console.error('Audit detail query error:', error);
      return c.json({ error: 'Operation not found' }, 404);
    }

    if (!data) {
      return c.json({ error: 'Operation not found' }, 404);
    }

    return c.json({ operation: data }, 200);
  } catch (err) {
    console.error('Get operation detail error:', err);
    return c.json({ error: 'Failed to retrieve operation' }, 500);
  }
});

/**
 * GET /stripe/audit/analytics
 *
 * Aggregated audit statistics for dashboard
 *
 * Query params:
 * - stripe_account_id (required)
 * - period (optional): day, week, month (default: month)
 */
router.get('/analytics', async (c) => {
  try {
    const { stripe_account_id, period = 'month' } = c.req.query();

    if (!stripe_account_id) {
      return c.json({ error: 'Missing stripe_account_id' }, 400);
    }

    const { supabaseAdmin } = await import('../lib/dsg-rpc');

    if (!supabaseAdmin) {
      return c.json({ error: 'Database not configured' }, 500);
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    if (period === 'day') {
      startDate.setDate(now.getDate() - 1);
    } else if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setMonth(now.getMonth() - 1);
    }

    const { data, error } = await supabaseAdmin
      .from('stripe_operation_audits')
      .select('dsg_decision, operation_type, payload')
      .eq('stripe_account_id', stripe_account_id)
      .gte('created_at', startDate.toISOString());

    if (error) {
      console.error('Analytics query error:', error);
      return c.json({ error: 'Failed to retrieve analytics' }, 500);
    }

    // Aggregate statistics
    const stats = {
      total_operations: data?.length || 0,
      by_decision: { ALLOW: 0, BLOCK: 0, REVIEW: 0 },
      by_operation_type: { charge: 0, refund: 0, payout: 0 },
    };

    (data || []).forEach((record: any) => {
      stats.by_decision[record.dsg_decision as keyof typeof stats.by_decision]++;
      stats.by_operation_type[record.operation_type as keyof typeof stats.by_operation_type]++;
    });

    return c.json(
      {
        period,
        stripe_account_id,
        stats,
      },
      200
    );
  } catch (err) {
    console.error('Get analytics error:', err);
    return c.json({ error: 'Failed to retrieve analytics' }, 500);
  }
});

export default router;
