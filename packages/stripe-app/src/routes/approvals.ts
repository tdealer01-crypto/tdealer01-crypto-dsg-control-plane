/**
 * Approvals Router
 *
 * Handles approval workflow for operations requiring review.
 * Merchants/operators can approve or reject pending operations.
 *
 * Routes:
 * - GET /pending - List pending approvals
 * - GET /{decision_id} - Get approval details
 * - POST /{decision_id}/approve - Approve operation
 * - POST /{decision_id}/reject - Reject operation
 */

import { Hono } from 'hono';
import { StripeStateManager, StripeOperationAudit } from '../lib/stripe-state';

const router = new Hono();

/**
 * Middleware: Verify Bearer token authentication
 *
 * All approval routes require Bearer token authentication.
 * Tokens are issued via OAuth or DSG Control Plane.
 */
router.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Missing or invalid Bearer token' }, 401);
  }

  // TODO: Validate token against Supabase/DSG session
  // For now, accept any Bearer token (remove before production)
  const token = authHeader.substring(7);
  if (!token) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Invalid token format' }, 401);
  }

  // Store token in context for later use
  c.set('token', token);
  await next();
});

/**
 * Helper: Get Supabase client from environment
 *
 * In a real implementation, this would use dependency injection
 * or a singleton Supabase client initialized at app startup.
 */
function getStateManager(): StripeStateManager {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase credentials not configured');
  }

  return new StripeStateManager(url, key);
}

/**
 * GET /stripe/approvals/pending
 *
 * List all pending approvals (operations with decision = 'REVIEW') for a Stripe account.
 *
 * Query params:
 * - stripe_account_id (required): Stripe account ID (acct_xxx)
 * - limit (optional): Results per page (default 50, max 500)
 * - offset (optional): Pagination offset (default 0)
 *
 * Response:
 * {
 *   "approvals": [
 *     {
 *       "id": "op_123",
 *       "stripe_account_id": "acct_xxx",
 *       "stripe_event_id": "evt_123",
 *       "operation_type": "charge",
 *       "dsg_decision": "REVIEW",
 *       "dsg_reason": "High-value operation requires approval",
 *       "created_at": "2025-06-06T12:00:00Z",
 *       "payload": { ... }
 *     }
 *   ],
 *   "total": 15,
 *   "limit": 50,
 *   "offset": 0
 * }
 */
router.get('/pending', async (c) => {
  try {
    const { stripe_account_id, limit = '50', offset = '0' } = c.req.query();

    // Validate required parameters
    if (!stripe_account_id) {
      return c.json(
        {
          error: 'INVALID_REQUEST',
          message: 'Missing required parameter: stripe_account_id',
        },
        400
      );
    }

    // Validate and sanitize limit and offset
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 500);
    const offsetNum = Math.max(parseInt(offset, 10) || 0, 0);

    // Get state manager
    const stateManager = getStateManager();

    // Query pending approvals (dsg_decision = 'REVIEW')
    const approvals = await stateManager.getAuditsByDecision(
      stripe_account_id,
      'REVIEW'
    );

    // Apply manual pagination (in production, use database-level pagination)
    const paginatedApprovals = approvals.slice(offsetNum, offsetNum + limitNum);

    return c.json(
      {
        approvals: paginatedApprovals.map((approval) => ({
          id: approval.id,
          stripe_account_id: approval.stripe_account_id,
          stripe_event_id: approval.stripe_event_id,
          stripe_object_id: approval.stripe_object_id,
          operation_type: approval.operation_type,
          dsg_decision: approval.dsg_decision,
          dsg_reason: approval.dsg_reason,
          status: approval.status,
          created_at: approval.created_at,
          payload: approval.payload,
        })),
        total: approvals.length,
        limit: limitNum,
        offset: offsetNum,
        stripe_account_id,
      },
      200
    );
  } catch (err) {
    console.error('Get pending approvals error:', err);
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve pending approvals',
        details: err instanceof Error ? err.message : undefined,
      },
      500
    );
  }
});

/**
 * GET /stripe/approvals/{decision_id}
 *
 * Get full details of a specific approval including audit trail and metadata.
 *
 * Path params:
 * - decision_id: Approval ID (operation audit ID)
 *
 * Response:
 * {
 *   "approval": {
 *     "id": "op_123",
 *     "stripe_account_id": "acct_xxx",
 *     "stripe_event_id": "evt_123",
 *     "stripe_object_id": "ch_123",
 *     "operation_type": "charge",
 *     "dsg_decision": "REVIEW",
 *     "dsg_reason": "High-value operation requires approval",
 *     "dsg_proof": "proof_hash_xxx",
 *     "status": "recorded",
 *     "created_at": "2025-06-06T12:00:00Z",
 *     "payload": { ... }
 *   }
 * }
 */
router.get('/:decision_id', async (c) => {
  try {
    const { decision_id } = c.req.param();

    // Validate required parameters
    if (!decision_id) {
      return c.json(
        {
          error: 'INVALID_REQUEST',
          message: 'Missing required parameter: decision_id',
        },
        400
      );
    }

    // TODO: Query stripe_operation_audits by ID
    // For now, return placeholder response
    // In production:
    // 1. Query Supabase for approval by ID
    // 2. Verify stripe_account_id matches authenticated user
    // 3. Include full payload and metadata

    return c.json(
      {
        approval: {
          id: decision_id,
          stripe_account_id: 'acct_xxx',
          stripe_event_id: 'evt_xxx',
          stripe_object_id: 'ch_xxx',
          operation_type: 'charge',
          dsg_decision: 'REVIEW',
          dsg_reason: 'High-value operation requires approval',
          status: 'recorded',
          created_at: new Date().toISOString(),
          payload: {},
        },
      },
      200
    );
  } catch (err) {
    console.error('Get approval detail error:', err);
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve approval',
        details: err instanceof Error ? err.message : undefined,
      },
      500
    );
  }
});

/**
 * POST /stripe/approvals/{decision_id}/approve
 *
 * Approve a pending operation, allowing it to proceed.
 *
 * Path params:
 * - decision_id: Approval ID (operation audit ID)
 *
 * Request body:
 * {
 *   "reason": "Approved by operations team",
 *   "approved_by": "user@example.com"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "id": "op_123",
 *   "status": "approved",
 *   "approved_at": "2025-06-06T12:30:00Z",
 *   "message": "Operation approved and ready for execution"
 * }
 */
router.post('/:decision_id/approve', async (c) => {
  try {
    const { decision_id } = c.req.param();
    const body = await c.req.json<{
      reason?: string;
      approved_by?: string;
    }>();

    // Validate required parameters
    if (!decision_id) {
      return c.json(
        {
          error: 'INVALID_REQUEST',
          message: 'Missing required parameter: decision_id',
        },
        400
      );
    }

    const { reason = '', approved_by = 'operator' } = body;

    // TODO: Implementation steps:
    // 1. Fetch approval record from stripe_operation_audits
    // 2. Verify approval exists and status = 'recorded' (pending)
    // 3. Verify dsg_decision = 'REVIEW'
    // 4. Validate stripe_account_id matches authenticated user
    // 5. Update approval status to 'approved'
    // 6. Record approval timestamp and approver info
    // 7. Call DSG gateway executor to proceed with operation
    // 8. Record approval event in audit trail
    // 9. Return updated approval record

    console.log('[APPROVAL] Approving operation:', {
      decision_id,
      reason,
      approved_by,
    });

    return c.json(
      {
        success: true,
        id: decision_id,
        status: 'approved',
        approved_at: new Date().toISOString(),
        message: 'Operation approved and ready for execution',
      },
      200
    );
  } catch (err) {
    console.error('Approve operation error:', err);
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to approve operation',
        details: err instanceof Error ? err.message : undefined,
      },
      500
    );
  }
});

/**
 * POST /stripe/approvals/{decision_id}/reject
 *
 * Reject a pending operation, blocking it and triggering auto-reverse if needed.
 *
 * Path params:
 * - decision_id: Approval ID (operation audit ID)
 *
 * Request body:
 * {
 *   "reason": "Rejected due to policy violation",
 *   "rejected_by": "user@example.com"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "id": "op_123",
 *   "status": "rejected",
 *   "rejected_at": "2025-06-06T12:30:00Z",
 *   "message": "Operation rejected and blocked",
 *   "auto_reverse": {
 *     "triggered": true,
 *     "type": "refund",
 *     "status": "pending"
 *   }
 * }
 */
router.post('/:decision_id/reject', async (c) => {
  try {
    const { decision_id } = c.req.param();
    const body = await c.req.json<{
      reason?: string;
      rejected_by?: string;
    }>();

    // Validate required parameters
    if (!decision_id) {
      return c.json(
        {
          error: 'INVALID_REQUEST',
          message: 'Missing required parameter: decision_id',
        },
        400
      );
    }

    const { reason = '', rejected_by = 'operator' } = body;

    // TODO: Implementation steps:
    // 1. Fetch approval record from stripe_operation_audits
    // 2. Verify approval exists and status = 'recorded' (pending)
    // 3. Verify dsg_decision = 'REVIEW'
    // 4. Validate stripe_account_id matches authenticated user
    // 5. Update approval status to 'rejected'
    // 6. Record rejection timestamp and rejector info
    // 7. Determine if auto-reverse is needed (check operation type)
    //    - charge.created → trigger refund
    //    - payout.created → trigger payout freeze/reversal
    //    - refund.created → mark as rejected (no auto-reverse needed)
    // 8. Call Stripe API to execute auto-reverse if applicable
    // 9. Record rejection event and auto-reverse in audit trail
    // 10. Return updated approval with auto-reverse status

    console.log('[APPROVAL] Rejecting operation:', {
      decision_id,
      reason,
      rejected_by,
    });

    return c.json(
      {
        success: true,
        id: decision_id,
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        message: 'Operation rejected and blocked',
        auto_reverse: {
          triggered: false,
          type: null,
          status: 'none',
        },
      },
      200
    );
  } catch (err) {
    console.error('Reject operation error:', err);
    return c.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to reject operation',
        details: err instanceof Error ? err.message : undefined,
      },
      500
    );
  }
});

export default router;
