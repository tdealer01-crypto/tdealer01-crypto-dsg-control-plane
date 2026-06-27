/**
 * Policy Rules Router
 *
 * Manages configurable governance policy rules (P0-7).
 * Replaces the old stripe_operation_policies with stripe_policy_rules.
 */

import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';

const router = new Hono();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Valid rule types and actions
const VALID_RULE_TYPES = ['amount_threshold', 'rate_limit', 'time_window', 'customer_allowlist', 'risk_score'];
const VALID_ACTIONS = ['ALLOW', 'BLOCK', 'REVIEW'];

/**
 * GET /stripe/policy-rules/list
 * List all policy rules for an org/account
 */
router.get('/list', async (c) => {
  try {
    const { org_id, stripe_account_id, rule_type, enabled } = c.req.query();

    if (!org_id) {
      return c.json({ error: 'Missing org_id' }, 400);
    }

    if (!supabase) {
      return c.json({ error: 'Database not configured' }, 500);
    }

    let query = supabase
      .from('stripe_policy_rules')
      .select('*')
      .eq('org_id', org_id)
      .order('priority', { ascending: true });

    if (stripe_account_id) {
      // Include both account-specific and org-wide rules
      query = query.or(`stripe_account_id.eq.${stripe_account_id},stripe_account_id.is.null`);
    } else {
      query = query.is('stripe_account_id', null);
    }

    if (rule_type) {
      query = query.eq('rule_type', rule_type);
    }
    if (enabled !== undefined) {
      query = query.eq('enabled', enabled === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('List policy rules error:', error.message);
      return c.json({ error: 'Failed to list policy rules' }, 500);
    }

    return c.json({
      rules: data || [],
      total: data?.length || 0,
      org_id,
      stripe_account_id,
    }, 200);
  } catch (err) {
    console.error('List policy rules error:', err);
    return c.json({ error: 'Failed to list policy rules' }, 500);
  }
});

/**
 * POST /stripe/policy-rules/create
 * Create a new policy rule
 */
router.post('/create', async (c) => {
  try {
    const body = await c.req.json<{
      org_id?: string;
      stripe_account_id?: string;
      rule_type?: string;
      name?: string;
      description?: string;
      conditions?: Record<string, unknown>;
      action?: string;
      priority?: number;
      created_by?: string;
    }>();

    const {
      org_id,
      stripe_account_id,
      rule_type,
      name,
      description,
      conditions,
      action,
      priority = 100,
      created_by,
    } = body;

    // Validation
    if (!org_id || !rule_type || !name || !conditions || !action) {
      return c.json({
        error: 'Missing required fields: org_id, rule_type, name, conditions, action'
      }, 400);
    }

    if (!VALID_RULE_TYPES.includes(rule_type)) {
      return c.json({
        error: `Invalid rule_type. Must be one of: ${VALID_RULE_TYPES.join(', ')}`
      }, 400);
    }

    if (!VALID_ACTIONS.includes(action)) {
      return c.json({
        error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`
      }, 400);
    }

    // Validate conditions based on rule_type
    const validatedTypeError = validateConditions(rule_type, conditions);
    if (validatedTypeError) {
      return c.json({ error: validatedTypeError }, 400);
    }

    if (!supabase) {
      return c.json({ error: 'Database not configured' }, 500);
    }

    const { data, error } = await supabase
      .from('stripe_policy_rules')
      .insert({
        org_id,
        stripe_account_id: stripe_account_id || null,
        rule_type,
        name,
        description,
        conditions,
        action,
        priority,
        created_by: created_by || null,
        enabled: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Create policy rule error:', error.message);
      return c.json({ error: 'Failed to create policy rule' }, 500);
    }

    return c.json({
      success: true,
      rule: data,
      message: 'Policy rule created successfully',
    }, 201);
  } catch (err) {
    console.error('Create policy rule error:', err);
    return c.json({ error: 'Failed to create policy rule' }, 500);
  }
});

/**
 * PUT /stripe/policy-rules/{rule_id}
 * Update an existing policy rule
 */
router.put('/:rule_id', async (c) => {
  try {
    const { rule_id } = c.req.param();
    const body = await c.req.json<{
      name?: string;
      description?: string;
      conditions?: Record<string, unknown>;
      action?: string;
      priority?: number;
      enabled?: boolean;
    }>();

    if (!rule_id) {
      return c.json({ error: 'Missing rule_id' }, 400);
    }

    if (!supabase) {
      return c.json({ error: 'Database not configured' }, 500);
    }

    // Validate action if provided
    if (body.action && !VALID_ACTIONS.includes(body.action)) {
      return c.json({
        error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`
      }, 400);
    }

    // Validate conditions if rule_type would change (need to fetch first)
    if (body.conditions) {
      const { data: existingRule } = await supabase
        .from('stripe_policy_rules')
        .select('rule_type')
        .eq('id', rule_id)
        .maybeSingle();

      if (existingRule) {
        const validatedTypeError = validateConditions(existingRule.rule_type, body.conditions);
        if (validatedTypeError) {
          return c.json({ error: validatedTypeError }, 400);
        }
      }
    }

    const { data, error } = await supabase
      .from('stripe_policy_rules')
      .update(body)
      .eq('id', rule_id)
      .select()
      .single();

    if (error) {
      console.error('Update policy rule error:', error.message);
      return c.json({ error: 'Failed to update policy rule' }, 500);
    }

    if (!data) {
      return c.json({ error: 'Policy rule not found' }, 404);
    }

    return c.json({
      success: true,
      rule: data,
      message: 'Policy rule updated successfully',
    }, 200);
  } catch (err) {
    console.error('Update policy rule error:', err);
    return c.json({ error: 'Failed to update policy rule' }, 500);
  }
});

/**
 * DELETE /stripe/policy-rules/{rule_id}
 * Delete a policy rule
 */
router.delete('/:rule_id', async (c) => {
  try {
    const { rule_id } = c.req.param();

    if (!rule_id) {
      return c.json({ error: 'Missing rule_id' }, 400);
    }

    if (!supabase) {
      return c.json({ error: 'Database not configured' }, 500);
    }

    const { error } = await supabase
      .from('stripe_policy_rules')
      .delete()
      .eq('id', rule_id);

    if (error) {
      console.error('Delete policy rule error:', error.message);
      return c.json({ error: 'Failed to delete policy rule' }, 500);
    }

    return c.json({
      success: true,
      rule_id,
      message: 'Policy rule deleted successfully',
    }, 200);
  } catch (err) {
    console.error('Delete policy rule error:', err);
    return c.json({ error: 'Failed to delete policy rule' }, 500);
  }
});

/**
 * POST /stripe/policy-rules/bulk
 * Bulk create/update rules (for initial setup)
 */
router.post('/bulk', async (c) => {
  try {
    const body = await c.req.json<{
      org_id: string;
      rules: Array<{
        stripe_account_id?: string;
        rule_type: string;
        name: string;
        description?: string;
        conditions: Record<string, unknown>;
        action: string;
        priority?: number;
        created_by?: string;
      }>;
    }>();

    const { org_id, rules } = body;

    if (!org_id || !Array.isArray(rules)) {
      return c.json({ error: 'Missing org_id or rules array' }, 400);
    }

    if (!supabase) {
      return c.json({ error: 'Database not configured' }, 500);
    }

    // Validate all rules
    for (const rule of rules) {
      if (!VALID_RULE_TYPES.includes(rule.rule_type)) {
        return c.json({
          error: `Invalid rule_type in rule "${rule.name}". Must be one of: ${VALID_RULE_TYPES.join(', ')}`
        }, 400);
      }
      if (!VALID_ACTIONS.includes(rule.action)) {
        return c.json({
          error: `Invalid action in rule "${rule.name}". Must be one of: ${VALID_ACTIONS.join(', ')}`
        }, 400);
      }
      const validatedTypeError = validateConditions(rule.rule_type, rule.conditions);
      if (validatedTypeError) {
        return c.json({
          error: `Validation failed for rule "${rule.name}": ${validatedTypeError}`
        }, 400);
      }
    }

    // Bulk insert
    const rulesToInsert = rules.map(r => ({
      org_id,
      stripe_account_id: r.stripe_account_id || null,
      rule_type: r.rule_type,
      name: r.name,
      description: r.description,
      conditions: r.conditions,
      action: r.action,
      priority: r.priority || 100,
      created_by: r.created_by || null,
      enabled: true,
    }));

    const { data, error } = await supabase
      .from('stripe_policy_rules')
      .insert(rulesToInsert)
      .select();

    if (error) {
      console.error('Bulk create rules error:', error.message);
      return c.json({ error: 'Failed to create rules' }, 500);
    }

    return c.json({
      success: true,
      rules: data,
      count: data?.length || 0,
      message: 'Rules created successfully',
    }, 201);
  } catch (err) {
    console.error('Bulk create rules error:', err);
    return c.json({ error: 'Failed to create rules' }, 500);
  }
});

/**
 * Validate conditions object based on rule_type
 */
function validateConditions(ruleType: string, conditions: Record<string, unknown>): string | null {
  switch (ruleType) {
    case 'amount_threshold':
      if (typeof conditions.max_amount_cents !== 'number' && typeof conditions.min_amount_cents !== 'number') {
        return 'amount_threshold requires max_amount_cents or min_amount_cents (number)';
      }
      break;
    case 'rate_limit':
      if (typeof conditions.max_operations !== 'number' || typeof conditions.window_seconds !== 'number') {
        return 'rate_limit requires max_operations (number) and window_seconds (number)';
      }
      break;
    case 'time_window':
      if (typeof conditions.start_time !== 'string' || typeof conditions.end_time !== 'string') {
        return 'time_window requires start_time and end_time (string HH:MM)';
      }
      // Validate time format
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(conditions.start_time) || !timeRegex.test(conditions.end_time)) {
        return 'time_window times must be in HH:MM format';
      }
      break;
    case 'customer_allowlist':
      if (!Array.isArray(conditions.customer_ids) && !Array.isArray(conditions.blocked_customer_ids)) {
        return 'customer_allowlist requires customer_ids[] or blocked_customer_ids[]';
      }
      break;
    case 'risk_score':
      if (typeof conditions.risk_threshold !== 'number') {
        return 'risk_score requires risk_threshold (number 0-100)';
      }
      if (conditions.risk_threshold < 0 || conditions.risk_threshold > 100) {
        return 'risk_threshold must be between 0 and 100';
      }
      break;
    default:
      return `Unknown rule_type: ${ruleType}`;
  }
  return null;
}

export default router;