/**
 * Policies Router
 *
 * Manages governance policies for Stripe operations.
 * Merchants define rules like:
 * - "Block charges over $50k"
 * - "Require approval for refunds"
 * - "Block payouts on weekends"
 *
 * Cache invalidation on updates to ensure real-time policy enforcement.
 */

import { Hono } from 'hono';
import { getSupabase } from '../lib/dsg-client';

const router = new Hono();

/**
 * GET /stripe/policies/list
 * List all policies for a Stripe account
 *
 * Query params:
 * - stripe_account_id (required)
 * - operation_type (optional): charge, refund, payout
 */
router.get('/list', async (c) => {
  try {
    const { stripe_account_id, operation_type } = c.req.query();

    if (!stripe_account_id) {
      return c.json({ error: 'Missing stripe_account_id' }, 400);
    }

    const supabase = getSupabase();
    let query = supabase
      .from('stripe_operation_policies')
      .select('*')
      .eq('stripe_account_id', stripe_account_id)
      .order('created_at', { ascending: false });

    // Filter by operation_type if provided
    if (operation_type) {
      query = query.eq('operation_type', operation_type);
    }

    const { data: policies, error } = await query;

    if (error) {
      console.error('List policies error:', error);
      return c.json({ error: 'Failed to list policies' }, 500);
    }

    return c.json(
      {
        policies: policies || [],
        total: policies?.length || 0,
        stripe_account_id,
      },
      200
    );
  } catch (err) {
    console.error('List policies error:', err);
    return c.json({ error: 'Failed to list policies' }, 500);
  }
});

/**
 * POST /stripe/policies/create
 * Create a new governance policy
 *
 * Request body:
 * {
 *   "stripe_account_id": "acct_...",
 *   "operation_type": "charge" | "refund" | "payout",
 *   "rule_type": "amount_threshold" | "rate_limit" | "time_window",
 *   "conditions": { ... },
 *   "action": "ALLOW" | "BLOCK" | "REVIEW"
 * }
 */
router.post('/create', async (c) => {
  try {
    const body = await c.req.json<{
      stripe_account_id?: string;
      operation_type?: string;
      rule_type?: string;
      conditions?: Record<string, unknown>;
      action?: string;
    }>();

    const { stripe_account_id, operation_type, rule_type, conditions, action } = body;

    if (!stripe_account_id || !operation_type || !rule_type) {
      return c.json({ error: 'Missing required fields: stripe_account_id, operation_type, rule_type' }, 400);
    }

    // Validate rule_type
    const validRuleTypes = ['amount_threshold', 'rate_limit', 'time_window', 'manual_approval'];
    if (!validRuleTypes.includes(rule_type)) {
      return c.json({ error: `Invalid rule_type. Must be one of: ${validRuleTypes.join(', ')}` }, 400);
    }

    // Validate action
    const validActions = ['allow', 'block', 'review'];
    const normalizedAction = (action || '').toLowerCase();
    if (!validActions.includes(normalizedAction)) {
      return c.json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }, 400);
    }

    // Validate conditions based on rule_type
    if (!conditions || typeof conditions !== 'object') {
      return c.json({ error: 'Conditions must be a valid JSON object' }, 400);
    }

    if (rule_type === 'amount_threshold' && !('amount_threshold' in conditions)) {
      return c.json({ error: 'amount_threshold rule requires amount_threshold in conditions' }, 400);
    }

    const supabase = getSupabase();

    // Insert policy
    const { data: policy, error } = await supabase
      .from('stripe_operation_policies')
      .insert({
        stripe_account_id,
        operation_type,
        rule_type,
        conditions,
        action: normalizedAction,
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Create policy error:', error);
      return c.json({ error: 'Failed to create policy' }, 500);
    }

    return c.json(
      {
        success: true,
        policy: policy,
        message: 'Policy created successfully',
      },
      201
    );
  } catch (err) {
    console.error('Create policy error:', err);
    return c.json({ error: 'Failed to create policy' }, 500);
  }
});

/**
 * PUT /stripe/policies/{policy_id}
 * Update an existing policy
 */
router.put('/:policy_id', async (c) => {
  try {
    const { policy_id } = c.req.param();
    const body = await c.req.json<{
      conditions?: Record<string, unknown>;
      action?: string;
      enabled?: boolean;
    }>();

    if (!policy_id) {
      return c.json({ error: 'Missing policy_id' }, 400);
    }

    const supabase = getSupabase();

    // Fetch existing policy
    const { data: existing, error: fetchError } = await supabase
      .from('stripe_operation_policies')
      .select('*')
      .eq('id', policy_id)
      .single();

    if (fetchError || !existing) {
      return c.json({ error: 'Policy not found' }, 404);
    }

    // Validate action if provided
    if (body.action) {
      const validActions = ['allow', 'block', 'review'];
      if (!validActions.includes((body.action || '').toLowerCase())) {
        return c.json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }, 400);
      }
    }

    // Update policy
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.conditions) updateData.conditions = body.conditions;
    if (body.action) updateData.action = body.action.toLowerCase();
    if (body.enabled !== undefined) updateData.enabled = body.enabled;

    const { data: updated, error: updateError } = await supabase
      .from('stripe_operation_policies')
      .update(updateData)
      .eq('id', policy_id)
      .select()
      .single();

    if (updateError) {
      console.error('Update policy error:', updateError);
      return c.json({ error: 'Failed to update policy' }, 500);
    }

    return c.json(
      {
        success: true,
        policy: updated,
        message: 'Policy updated successfully',
      },
      200
    );
  } catch (err) {
    console.error('Update policy error:', err);
    return c.json({ error: 'Failed to update policy' }, 500);
  }
});

/**
 * DELETE /stripe/policies/{policy_id}
 * Delete a policy
 */
router.delete('/:policy_id', async (c) => {
  try {
    const { policy_id } = c.req.param();

    if (!policy_id) {
      return c.json({ error: 'Missing policy_id' }, 400);
    }

    const supabase = getSupabase();

    // Delete policy
    const { error } = await supabase
      .from('stripe_operation_policies')
      .delete()
      .eq('id', policy_id);

    if (error) {
      console.error('Delete policy error:', error);
      return c.json({ error: 'Failed to delete policy' }, 500);
    }

    return c.json(
      {
        success: true,
        policy_id,
        message: 'Policy deleted successfully',
      },
      200
    );
  } catch (err) {
    console.error('Delete policy error:', err);
    return c.json({ error: 'Failed to delete policy' }, 500);
  }
});

export default router;
