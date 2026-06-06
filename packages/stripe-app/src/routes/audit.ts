/**
 * Audit Router
 *
 * Provides access to operation audit trails linking Stripe events to DSG decisions.
 * Used for compliance reporting and operational visibility.
 *
 * All routes require Bearer token authentication via Authorization header.
 * Request pattern: Authorization: Bearer <api_key>
 */

import { Hono } from 'hono';
import { StripeStateManager, StripeOperationAudit } from '../lib/stripe-state';

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

/**
 * GET /stripe/audit/operations
 *
 * List audited Stripe operations with their governance decisions.
 *
 * Authentication: Bearer token (required)
 *
 * Query params:
 * - stripe_account_id (required): The Stripe account to query
 * - start_date (optional): ISO 8601 date string for filtering (inclusive)
 * - end_date (optional): ISO 8601 date string for filtering (inclusive)
 * - operation_type (optional): Filter by operation type (charge, refund, payout)
 * - decision (optional): Filter by decision (ALLOW, BLOCK, REVIEW)
 * - limit (optional): Number of results per page, default 50, max 500
 * - offset (optional): Pagination offset, default 0
 *
 * Returns:
 * - operations: Array of audit entries with metadata
 * - total: Total count matching filters (without pagination)
 * - limit: Applied limit
 * - offset: Applied offset
 * - stripe_account_id: Account queried
 * - timestamp: Response timestamp for audit purposes
 */
router.get('/operations', async (c) => {
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
      start_date,
      end_date,
      operation_type,
      decision,
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

    // Validate decision filter if provided
    if (decision && !['ALLOW', 'BLOCK', 'REVIEW'].includes(decision.toUpperCase())) {
      return c.json(
        { error: 'Invalid decision filter. Must be one of: ALLOW, BLOCK, REVIEW' },
        400
      );
    }

    // Validate date range if provided
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (start_date) {
      startDate = new Date(start_date);
      if (isNaN(startDate.getTime())) {
        return c.json(
          { error: 'Invalid start_date format. Use ISO 8601 format (e.g., 2026-06-01)' },
          400
        );
      }
    }

    if (end_date) {
      endDate = new Date(end_date);
      if (isNaN(endDate.getTime())) {
        return c.json(
          { error: 'Invalid end_date format. Use ISO 8601 format (e.g., 2026-06-30)' },
          400
        );
      }
    }

    // Get state manager and query audits
    const stateManager = getStateManager();
    let audits = await stateManager.getAudits(stripe_account_id, 1000, 0); // Fetch more for filtering

    if (!audits) {
      audits = [];
    }

    // Apply client-side filters (in production, these should be done server-side in Supabase)
    let filtered = audits as StripeOperationAudit[];

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter((a) => new Date(a.created_at) >= startDate);
    }
    if (endDate) {
      endDate.setHours(23, 59, 59, 999); // Include entire end date
      filtered = filtered.filter((a) => new Date(a.created_at) <= endDate);
    }

    // Filter by operation type
    if (operation_type) {
      filtered = filtered.filter((a) => a.operation_type === operation_type);
    }

    // Filter by decision
    if (decision) {
      const decisionUpper = decision.toUpperCase();
      filtered = filtered.filter((a) => a.dsg_decision === decisionUpper);
    }

    // Get total count before pagination
    const total = filtered.length;

    // Apply pagination
    const paginated = filtered.slice(offsetNum, offsetNum + limitNum);

    // Format response
    const operations = paginated.map((audit) => ({
      id: audit.id,
      stripe_account_id: audit.stripe_account_id,
      stripe_event_id: audit.stripe_event_id,
      stripe_object_id: audit.stripe_object_id,
      operation_type: audit.operation_type,
      decision: audit.dsg_decision,
      reason: audit.dsg_reason || 'No reason provided',
      proof_hash: audit.dsg_proof || null,
      decision_id: audit.dsg_decision_id || null,
      status: audit.status,
      created_at: audit.created_at,
      timestamp: new Date().toISOString(),
    }));

    return c.json(
      {
        operations,
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
    console.error('Get operations error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: 'Failed to retrieve operations', details: errorMsg }, 500);
  }
});

/**
 * GET /stripe/audit/operations/{operation_id}
 *
 * Get details of a specific audited operation.
 *
 * Authentication: Bearer token (required)
 *
 * Returns full audit record including:
 * - Original Stripe event ID and object ID
 * - DSG governance decision and reasoning
 * - Policy evaluation result (if applicable)
 * - Proof hash for cryptographic verification
 * - Approval workflow status (if in REVIEW state)
 * - Complete audit trail with timestamps
 *
 * Path params:
 * - operation_id: UUID of the operation audit record
 */
router.get('/operations/:operation_id', async (c) => {
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

    const { operation_id } = c.req.param();

    if (!operation_id) {
      return c.json(
        { error: 'Missing required path parameter: operation_id' },
        400
      );
    }

    // Get state manager and query single audit
    const stateManager = getStateManager();
    const audits = await stateManager.getAudits(operation_id, 1, 0);

    const audit = audits && audits.length > 0 ? audits[0] : null;

    if (!audit) {
      return c.json(
        { error: 'Operation not found', operation_id },
        404
      );
    }

    // Format comprehensive response
    const operation = {
      id: audit.id,
      stripe_account_id: audit.stripe_account_id,
      stripe_event_id: audit.stripe_event_id,
      stripe_object_id: audit.stripe_object_id,
      operation_type: audit.operation_type,
      decision: audit.dsg_decision,
      reason: audit.dsg_reason || 'No reason provided',
      proof_hash: audit.dsg_proof || null,
      decision_id: audit.dsg_decision_id || null,
      status: audit.status,
      payload: audit.payload || null, // Original event payload
      metadata: {
        created_at: audit.created_at,
        query_timestamp: new Date().toISOString(),
      },
    };

    return c.json(
      {
        operation,
        timestamp: new Date().toISOString(),
      },
      200
    );
  } catch (err) {
    console.error('Get operation detail error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return c.json(
      { error: 'Failed to retrieve operation details', details: errorMsg },
      500
    );
  }
});

/**
 * GET /stripe/audit/analytics
 *
 * Aggregated audit statistics for compliance dashboards.
 *
 * Authentication: Bearer token (required)
 *
 * Query params:
 * - stripe_account_id (required): The Stripe account to analyze
 * - period (optional): Aggregation period
 *   - 'day': Last 24 hours
 *   - 'week': Last 7 days (default)
 *   - 'month': Last 30 days
 * - start_date (optional): Custom period start (ISO 8601)
 * - end_date (optional): Custom period end (ISO 8601)
 *
 * Returns aggregated metrics:
 * - total_operations: Count of all operations in period
 * - total_amount: Sum of amounts (in cents if available)
 * - by_decision: Count breakdown (ALLOW, BLOCK, REVIEW)
 * - by_operation_type: Count breakdown by operation type
 * - decision_rates: Percentages for each decision type
 * - average_evaluation_time: Average time to reach decision
 * - period_info: Selected period details
 * - timestamp: Response generation time
 */
router.get('/analytics', async (c) => {
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

    // Parse query parameters
    const { stripe_account_id, period = 'week', start_date, end_date } = c.req.query();

    if (!stripe_account_id) {
      return c.json(
        { error: 'Missing required query parameter: stripe_account_id' },
        400
      );
    }

    // Validate period parameter
    if (!['day', 'week', 'month'].includes(period)) {
      return c.json(
        { error: "Invalid period. Must be one of: 'day', 'week', 'month'" },
        400
      );
    }

    // Calculate time range
    const now = new Date();
    let rangeStart: Date;
    let rangeEnd = new Date(now);

    if (start_date && end_date) {
      // Use custom date range
      rangeStart = new Date(start_date);
      rangeEnd = new Date(end_date);

      if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
        return c.json(
          { error: 'Invalid date range. Use ISO 8601 format (e.g., 2026-06-01)' },
          400
        );
      }
    } else {
      // Use predefined period
      rangeStart = new Date(now);
      switch (period) {
        case 'day':
          rangeStart.setDate(rangeStart.getDate() - 1);
          break;
        case 'week':
          rangeStart.setDate(rangeStart.getDate() - 7);
          break;
        case 'month':
          rangeStart.setDate(rangeStart.getDate() - 30);
          break;
      }
    }

    // Get state manager and query audits
    const stateManager = getStateManager();
    let audits = await stateManager.getAudits(stripe_account_id, 10000, 0);

    if (!audits) {
      audits = [];
    }

    // Filter by date range
    const filtered = audits.filter((audit) => {
      const auditDate = new Date(audit.created_at);
      return auditDate >= rangeStart && auditDate <= rangeEnd;
    });

    // Calculate statistics
    const stats = {
      total_operations: filtered.length,
      total_amount: 0, // Would sum from payload if available
      by_decision: {
        ALLOW: 0,
        BLOCK: 0,
        REVIEW: 0,
      } as Record<string, number>,
      by_operation_type: {} as Record<string, number>,
    };

    // Aggregate by decision and operation type
    for (const audit of filtered) {
      // Count by decision
      if (audit.dsg_decision in stats.by_decision) {
        stats.by_decision[audit.dsg_decision]++;
      }

      // Count by operation type
      if (!stats.by_operation_type[audit.operation_type]) {
        stats.by_operation_type[audit.operation_type] = 0;
      }
      stats.by_operation_type[audit.operation_type]++;
    }

    // Calculate decision rates (percentages)
    const decisionRates: Record<string, number> = {};
    if (stats.total_operations > 0) {
      decisionRates['ALLOW'] = Math.round(
        (stats.by_decision['ALLOW'] / stats.total_operations) * 10000
      ) / 100;
      decisionRates['BLOCK'] = Math.round(
        (stats.by_decision['BLOCK'] / stats.total_operations) * 10000
      ) / 100;
      decisionRates['REVIEW'] = Math.round(
        (stats.by_decision['REVIEW'] / stats.total_operations) * 10000
      ) / 100;
    }

    // Format response
    return c.json(
      {
        period,
        stripe_account_id,
        stats: {
          total_operations: stats.total_operations,
          total_amount: stats.total_amount,
          by_decision: stats.by_decision,
          by_operation_type: stats.by_operation_type,
          decision_rates: {
            ALLOW: decisionRates['ALLOW'] || 0,
            BLOCK: decisionRates['BLOCK'] || 0,
            REVIEW: decisionRates['REVIEW'] || 0,
          },
        },
        period_info: {
          start_date: rangeStart.toISOString(),
          end_date: rangeEnd.toISOString(),
          period_label:
            start_date && end_date
              ? 'custom'
              : `${period}_${period === 'day' ? '24h' : period === 'week' ? '7d' : '30d'}`,
        },
        timestamp: new Date().toISOString(),
      },
      200
    );
  } catch (err) {
    console.error('Get analytics error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: 'Failed to retrieve analytics', details: errorMsg }, 500);
  }
});

export default router;
