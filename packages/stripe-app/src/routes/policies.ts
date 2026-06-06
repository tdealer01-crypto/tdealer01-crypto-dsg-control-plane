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
 *
 * All routes require Bearer token authentication via Authorization header.
 * Request pattern: Authorization: Bearer <api_key>
 */

import { Hono } from 'hono';
import { StripeStateManager, StripeOperationPolicy } from '../lib/stripe-state';
import { policyCache } from '../lib/policy-cache';

const router = new Hono();

// Middleware to extract and validate Bearer token
const extractBearerToken = (authHeader?: string): string | null => {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
};

// Initialize Supabase client for this route
const getStateManager = (): StripeStateManager => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }

  return new StripeStateManager(supabaseUrl, supabaseKey);
};

// Validation helpers
const isValidRuleType = (ruleType: string): boolean => {
  return ['amount_threshold', 'rate_limit', 'time_window'].includes(ruleType);
};

const isValidAction = (action: string): boolean => {
  return ['allow', 'block', 'review'].includes(action.toLowerCase());
};

const isValidOperationType = (operationType: string): boolean => {
  return ['charge', 'refund', 'payout'].includes(operationType.toLowerCase());
};

// Validate conditions based on rule type
const validateConditions = (
  ruleType: string,
  conditions: Record<string, unknown>
): boolean => {
  if (!conditions || typeof conditions !== 'object') {
    return false;
  }

  switch (ruleType) {
    case 'amount_threshold':
      // Must have threshold_cents (number > 0)
      return (
        'threshold_cents' in conditions &&
        typeof conditions.threshold_cents === 'number' &&
        (conditions.threshold_cents as number) > 0
      );

    case 'rate_limit':
      // Must have max_operations (number > 0) and time_window_seconds (number > 0)
      return (
        'max_operations' in conditions &&
        'time_window_seconds' in conditions &&
        typeof conditions.max_operations === 'number' &&
        typeof conditions.time_window_seconds === 'number' &&
        (conditions.max_operations as number) > 0 &&
        (conditions.time_window_seconds as number) > 0
      );

    case 'time_window':
      // Must have start_hour, end_hour (0-23), and day_of_week optional
      return (
        'start_hour' in conditions &&
        'end_hour' in conditions &&
        typeof conditions.start_hour === 'number' &&
        typeof conditions.end_hour === 'number' &&
        (conditions.start_hour as number) >= 0 &&
        (conditions.start_hour as number) <= 23 &&
        (conditions.end_hour as number) >= 0 &&
        (conditions.end_hour as number) <= 23 &&
        (conditions.start_hour as number) < (conditions.end_hour as number)
      );

    default:
      return false;
  }
};

/**
 * GET /stripe/policies/list
 * List all policies for a Stripe account
 *
 * Authentication: Bearer token (required)
 *
 * Query params:
 * - stripe_account_id (required): The Stripe account to query
 * - operation_type (optional): Filter by operation type (charge, refund, payout)
 * - limit (optional): Number of results per page, default 50, max 500
 * - offset (optional): Pagination offset, default 0
 *
 * Returns:
 * - policies: Array of policy objects with full details
 * - total: Total count of policies (without pagination)
 * - limit: Applied limit
 * - offset: Applied offset
 * - stripe_account_id: Account queried
 * - timestamp: Response timestamp for audit purposes
 */
router.get('/list', async (c) => {
  try {
    // Extract and validate Bearer token
    const authHeader = c.req.header('Authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return c.json(
        { error: 'Missing or invalid Authorization header. Use: Authorization: Bearer <token>' },
        401
      );
    }

    // Parse and validate query parameters
    const {
      stripe_account_id,
      operation_type,
      limit = '50',
      offset = '0',
    } = c.req.query();

    if (!stripe_account_id) {
      return c.json(
        { error: 'Missing required query parameter: stripe_account_id' },
        400
      );
    }

    // Validate and parse pagination parameters
    let limitNum: number;
    let offsetNum: number;

    try {
      limitNum = Math.min(parseInt(limit, 10), 500);
      if (limitNum < 1) limitNum = 50;
    } catch {
      limitNum = 50;
    }

    try {
      offsetNum = Math.max(0, parseInt(offset, 10));
    } catch {
      offsetNum = 0;
    }

    // Validate operation_type filter if provided
    if (operation_type && !isValidOperationType(operation_type)) {
      return c.json(
        { error: 'Invalid operation_type. Must be one of: charge, refund, payout' },
        400
      );
    }

    // Get state manager and query policies
    const stateManager = getStateManager();
    let policies = await stateManager.getPolicies(stripe_account_id);

    if (!policies) {
      policies = [];
    }

    // Filter by operation_type if provided
    if (operation_type) {
      policies = policies.filter((p) => p.operation_type === operation_type);
    }

    // Get total count before pagination
    const total = policies.length;

    // Apply pagination
    const paginated = policies.slice(offsetNum, offsetNum + limitNum);

    // Format response
    const formattedPolicies = paginated.map((policy) => ({
      id: policy.id,
      stripe_account_id: policy.stripe_account_id,
      operation_type: policy.operation_type,
      rule_type: policy.rule_type || null,
      conditions: policy.conditions,
      action: policy.action,
      enabled: policy.enabled,
      created_at: policy.created_at,
      updated_at: policy.updated_at,
    }));

    return c.json(
      {
        policies: formattedPolicies,
        total,
        limit: limitNum,
        offset: offsetNum,
        has_more: offsetNum + limitNum < total,
        stripe_account_id,
        timestamp: new Date().toISOString(),
      },
      200
    );
  } catch (err) {
    console.error('List policies error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: 'Failed to list policies', details: errorMsg }, 500);
  }
});

/**
 * POST /stripe/policies/create
 * Create a new governance policy
 *
 * Authentication: Bearer token (required)
 *
 * Request body:
 * {
 *   "stripe_account_id": "acct_...",
 *   "operation_type": "charge" | "refund" | "payout",
 *   "rule_type": "amount_threshold" | "rate_limit" | "time_window",
 *   "conditions": { ... },
 *   "action": "allow" | "block" | "review"
 * }
 *
 * Condition schemas:
 * - amount_threshold: { "threshold_cents": 50000 }
 * - rate_limit: { "max_operations": 10, "time_window_seconds": 3600 }
 * - time_window: { "start_hour": 9, "end_hour": 17, "day_of_week": [1,2,3,4,5] }
 *
 * Returns: Created policy with ID and timestamps
 */
router.post('/create', async (c) => {
  try {
    // Extract and validate Bearer token
    const authHeader = c.req.header('Authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return c.json(
        { error: 'Missing or invalid Authorization header. Use: Authorization: Bearer <token>' },
        401
      );
    }

    const body = await c.req.json<{
      stripe_account_id?: string;
      operation_type?: string;
      rule_type?: string;
      conditions?: Record<string, unknown>;
      action?: string;
    }>();

    const { stripe_account_id, operation_type, rule_type, conditions, action } = body;

    // Validate required fields
    if (!stripe_account_id || !operation_type || !rule_type || !action) {
      return c.json(
        {
          error: 'Missing required fields: stripe_account_id, operation_type, rule_type, action',
        },
        400
      );
    }

    // Validate operation_type
    if (!isValidOperationType(operation_type)) {
      return c.json(
        { error: 'Invalid operation_type. Must be one of: charge, refund, payout' },
        400
      );
    }

    // Validate rule_type
    if (!isValidRuleType(rule_type)) {
      return c.json(
        {
          error: 'Invalid rule_type. Must be one of: amount_threshold, rate_limit, time_window',
        },
        400
      );
    }

    // Validate action
    if (!isValidAction(action)) {
      return c.json(
        { error: 'Invalid action. Must be one of: allow, block, review' },
        400
      );
    }

    // Validate conditions
    if (!conditions || typeof conditions !== 'object') {
      return c.json(
        { error: 'Invalid or missing conditions object' },
        400
      );
    }

    if (!validateConditions(rule_type, conditions)) {
      let conditionError = 'Invalid conditions for rule_type: ';
      switch (rule_type) {
        case 'amount_threshold':
          conditionError +=
            'Must include threshold_cents (positive number)';
          break;
        case 'rate_limit':
          conditionError +=
            'Must include max_operations and time_window_seconds (positive numbers)';
          break;
        case 'time_window':
          conditionError +=
            'Must include start_hour and end_hour (0-23, start < end)';
          break;
      }
      return c.json({ error: conditionError }, 400);
    }

    // Create policy in Supabase
    const stateManager = getStateManager();
    const createdPolicy = await stateManager.createPolicy(
      stripe_account_id,
      operation_type,
      rule_type,
      conditions,
      action.toLowerCase() as 'allow' | 'block' | 'review'
    );

    // Invalidate cache for this account
    policyCache.invalidate(stripe_account_id, operation_type);

    // Format and return created policy
    const response = {
      success: true,
      policy_id: createdPolicy.id,
      stripe_account_id: createdPolicy.stripe_account_id,
      operation_type: createdPolicy.operation_type,
      rule_type: createdPolicy.rule_type,
      conditions: createdPolicy.conditions,
      action: createdPolicy.action,
      enabled: createdPolicy.enabled,
      created_at: createdPolicy.created_at,
      updated_at: createdPolicy.updated_at,
      message: 'Policy created successfully',
    };

    return c.json(response, 201);
  } catch (err) {
    console.error('Create policy error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return c.json(
      { error: 'Failed to create policy', details: errorMsg },
      500
    );
  }
});

/**
 * PUT /stripe/policies/{policy_id}
 * Update an existing policy
 *
 * Authentication: Bearer token (required)
 *
 * Path params:
 * - policy_id: UUID of the policy to update
 *
 * Request body (all fields optional):
 * {
 *   "conditions": { ... },
 *   "action": "allow" | "block" | "review",
 *   "enabled": true | false
 * }
 *
 * Returns: Updated policy with new timestamps
 */
router.put('/:policy_id', async (c) => {
  try {
    // Extract and validate Bearer token
    const authHeader = c.req.header('Authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return c.json(
        { error: 'Missing or invalid Authorization header. Use: Authorization: Bearer <token>' },
        401
      );
    }

    const { policy_id } = c.req.param();
    const body = await c.req.json<{
      conditions?: Record<string, unknown>;
      action?: string;
      enabled?: boolean;
    }>();

    if (!policy_id) {
      return c.json({ error: 'Missing policy_id in path' }, 400);
    }

    // TODO: Implement policy update in stripe-state.ts
    // For now, return error indicating the feature is pending
    return c.json(
      {
        error: 'Policy update not yet implemented',
        message:
          'Update functionality requires StripeStateManager.updatePolicy() implementation',
      },
      501
    );
  } catch (err) {
    console.error('Update policy error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return c.json(
      { error: 'Failed to update policy', details: errorMsg },
      500
    );
  }
});

/**
 * DELETE /stripe/policies/{policy_id}
 * Delete a policy (sets enabled = false for audit trail)
 *
 * Authentication: Bearer token (required)
 *
 * Path params:
 * - policy_id: UUID of the policy to delete
 *
 * Returns: Success message with policy_id
 */
router.delete('/:policy_id', async (c) => {
  try {
    // Extract and validate Bearer token
    const authHeader = c.req.header('Authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return c.json(
        { error: 'Missing or invalid Authorization header. Use: Authorization: Bearer <token>' },
        401
      );
    }

    const { policy_id } = c.req.param();

    if (!policy_id) {
      return c.json({ error: 'Missing policy_id in path' }, 400);
    }

    // TODO: Implement policy deletion in stripe-state.ts
    // For now, return error indicating the feature is pending
    return c.json(
      {
        error: 'Policy deletion not yet implemented',
        message:
          'Deletion functionality requires StripeStateManager.deletePolicy() implementation',
      },
      501
    );
  } catch (err) {
    console.error('Delete policy error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return c.json(
      { error: 'Failed to delete policy', details: errorMsg },
      500
    );
  }
});

export default router;
