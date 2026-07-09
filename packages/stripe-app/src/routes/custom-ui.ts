/**
 * Custom UI Actions Router
 *
 * Handles pre-execution gates for custom UI actions in Stripe Dashboard.
 * When a merchant clicks a DSG-controlled button (e.g., "Create Charge with Approval"),
 * the request comes through this router for policy evaluation before proceeding.
 *
 * Performance target: <2s policy evaluation (Stripe UI timeout)
 */

import { Hono } from 'hono';
import { getSupabase, gatewayCheckStripeOperation } from '../lib/dsg-client';
import { createStripeApproval } from '../handlers/approval-handler';

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
 *   "params": {
 *     "amount": 10000,
 *     "currency": "usd",
 *     ...other Stripe API params
 *   }
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
    const startTime = Date.now();
    const body = await c.req.json<{
      stripe_account_id?: string;
      action?: string;
      params?: Record<string, unknown>;
    }>();

    const { stripe_account_id, action, params } = body;

    if (!stripe_account_id || !action) {
      return c.json(
        { error: 'Missing required fields: stripe_account_id, action' },
        400
      );
    }

    const supabase = getSupabase();

    // Check if stripe_account_id is linked to a DSG org
    const { data: account, error: accountError } = await supabase
      .from('stripe_app_accounts')
      .select('dsg_org_id, fail_safe_mode')
      .eq('stripe_account_id', stripe_account_id)
      .eq('status', 'active')
      .single();

    if (accountError || !account) {
      return c.json({ error: 'Account not found or inactive' }, 404);
    }

    // Evaluate policies using the existing gateway check
    const amount_cents = typeof params?.amount === 'number'
      ? params.amount
      : 0;

    const decision = await gatewayCheckStripeOperation({
      stripe_account_id,
      action,
      amount_cents,
      currency: (params?.currency as string) || 'usd',
      context: params as Record<string, unknown>,
    });

    const elapsedTime = Date.now() - startTime;

    // If evaluation takes more than 2 seconds, default to REVIEW
    if (elapsedTime > 2000) {
      return c.json(
        {
          decision: 'REVIEW',
          reason: 'Policy evaluation timeout - defaulting to review',
          evaluation_time_ms: elapsedTime,
        },
        200
      );
    }

    // Handle based on decision
    if (decision.decision === 'REVIEW' || decision.decision === 'BLOCK') {
      // Create approval record
      const stripeEventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const approvalResult = await createStripeApproval({
        stripe_account_id,
        stripe_event_id: stripeEventId,
        stripe_object_id: `obj_${Date.now()}`,
        operation_type: (action.split('.')[0] || 'charge') as 'charge' | 'payout' | 'refund',
        amount_cents,
        currency: (params?.currency as string) || 'usd',
        reason: decision.reason,
      });

      if (!approvalResult.ok) {
        return c.json(
          {
            error: 'Failed to create approval',
            message: approvalResult.error,
          },
          500
        );
      }

      const approvalUrl = `${process.env.DSG_APP_URL || 'https://app.dsg.pics'}/approvals/${stripeEventId}`;

      return c.json(
        {
          decision: decision.decision,
          reason: decision.reason,
          approval_id: stripeEventId,
          approval_url: approvalUrl,
          evaluation_time_ms: elapsedTime,
        },
        200
      );
    }

    // For ALLOW, execute directly and record audit
    const { error: auditError } = await supabase
      .from('stripe_operation_audits')
      .insert({
        stripe_account_id,
        stripe_event_id: `evt_auto_${Date.now()}`,
        stripe_object_id: `obj_auto_${Date.now()}`,
        operation_type: action.split('.')[0] || 'charge',
        dsg_decision: 'ALLOW',
        dsg_reason: decision.reason,
        status: 'executed',
        payload: {
          action,
          params,
          auto_approved: true,
        },
        created_at: new Date().toISOString(),
      });

    if (auditError) {
      console.error('Failed to record audit:', auditError);
      // Continue even if audit fails
    }

    return c.json(
      {
        decision: 'ALLOW',
        reason: decision.reason || 'Action allowed by policy',
        evaluation_time_ms: elapsedTime,
      },
      200
    );
  } catch (err) {
    console.error('Custom UI execute error:', err);
    return c.json(
      {
        error: 'Execution failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      500
    );
  }
});

export default router;
