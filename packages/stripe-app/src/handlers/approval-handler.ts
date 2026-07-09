/**
 * Stripe Approval Workflow Handler
 *
 * Manages operator approval/rejection of Stripe operations flagged for review.
 * Integrates with the DSG approval system and stripe_operation_audits table.
 *
 * Phase 4: Gateway Integration scaffold
 */

import type { GatewayApprovalDecision } from '@/lib/gateway/approvals';
import {
  buildApprovalToken,
  buildApprovalHash,
  decideGatewayApproval,
  listPendingGatewayApprovals,
} from '@/lib/gateway/approvals';

export interface StripeApprovalRequest {
  stripe_account_id: string;
  stripe_event_id: string;
  stripe_object_id: string;
  operation_type: 'charge' | 'payout' | 'refund';
  amount_cents?: number;
  currency?: string;
  dsg_decision_id?: string;
  reason?: string;
}

export interface StripeApprovalDecision extends GatewayApprovalDecision {
  stripe_event_id?: string;
  operation_type?: string;
}

/**
 * Create a pending approval for a Stripe operation
 *
 * Stores the operation in the approval queue and assigns an approval token.
 * The operator can then approve or reject via the approval dashboard.
 *
 * SCAFFOLD: Basic structure only.
 * Implementation: Insert into stripe_operation_audits with status='review'.
 *
 * @param request - Stripe operation approval request
 * @returns Approval token and metadata
 */
export async function createStripeApproval(
  request: StripeApprovalRequest
): Promise<StripeApprovalDecision> {
  try {
    // Log approval creation
    console.log('[STRIPE-APPROVAL] Creating approval:', {
      stripe_event_id: request.stripe_event_id,
      operation_type: request.operation_type,
      amount_cents: request.amount_cents,
    });

    // Generate approval token
    const approvalToken = buildApprovalToken();

    // Store in stripe_operation_audits table
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { persistSession: false } }
    );

    const { data: audit, error } = await supabase
      .from('stripe_operation_audits')
      .insert({
        stripe_account_id: request.stripe_account_id,
        stripe_event_id: request.stripe_event_id,
        stripe_object_id: request.stripe_object_id,
        operation_type: request.operation_type,
        dsg_decision: 'REVIEW',
        dsg_reason: request.reason || 'Awaiting operator review',
        dsg_decision_id: request.dsg_decision_id || null,
        status: 'recorded',
        payload: {
          amount_cents: request.amount_cents,
          currency: request.currency,
          created_at: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[STRIPE-APPROVAL] Failed to create approval:', error);
      return {
        ok: false,
        error: error.message || 'approval_creation_failed',
      };
    }

    return {
      ok: true,
      approvalToken,
      approvalHash: buildApprovalHash({
        stripeEventId: request.stripe_event_id,
        operationType: request.operation_type,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'approval_creation_failed',
    };
  }
}

/**
 * Approve a pending Stripe operation
 *
 * Called by an operator through the approval dashboard.
 * Updates the operation status and generates an approval token for execution.
 *
 * SCAFFOLD: Basic structure only.
 * Implementation: Update stripe_operation_audits, call gateway approval logic.
 *
 * @param stripeEventId - Stripe event ID to approve
 * @param operatorId - User ID of approving operator
 * @param operatorRole - Role of approving operator
 * @param note - Optional approval note
 * @returns Approval token for execution
 */
export async function approveStripeOperation(
  stripeEventId: string,
  operatorId: string,
  operatorRole: string,
  note?: string
): Promise<StripeApprovalDecision> {
  try {
    // Log approval
    console.log('[STRIPE-APPROVAL] Approving operation:', {
      stripe_event_id: stripeEventId,
      operator_id: operatorId,
      note,
    });

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { persistSession: false } }
    );

    // Fetch approval from stripe_operation_audits
    const { data: approval, error: fetchError } = await supabase
      .from('stripe_operation_audits')
      .select('*')
      .eq('stripe_event_id', stripeEventId)
      .eq('dsg_decision', 'REVIEW')
      .single();

    if (fetchError || !approval) {
      return {
        ok: false,
        error: 'approval_not_found_or_already_decided',
      };
    }

    // Update stripe_operation_audits to status='reviewed'
    const { error: updateError } = await supabase
      .from('stripe_operation_audits')
      .update({
        status: 'reviewed',
        dsg_decision: 'ALLOW',
        dsg_reason: note || 'Approved by operator',
        payload: {
          ...approval.payload,
          approved_by: operatorId,
          approved_at: new Date().toISOString(),
          approver_role: operatorRole,
        },
      })
      .eq('stripe_event_id', stripeEventId);

    if (updateError) {
      console.error('[STRIPE-APPROVAL] Failed to update approval:', updateError);
      return {
        ok: false,
        error: updateError.message || 'approval_update_failed',
      };
    }

    return {
      ok: true,
      approvalToken: buildApprovalToken(),
      stripe_event_id: stripeEventId,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'approval_failed',
    };
  }
}

/**
 * Reject a pending Stripe operation
 *
 * Called by an operator through the approval dashboard.
 * Blocks the operation and records rejection in the audit trail.
 *
 * SCAFFOLD: Basic structure only.
 * Implementation: Update stripe_operation_audits, call gateway approval logic.
 *
 * @param stripeEventId - Stripe event ID to reject
 * @param operatorId - User ID of rejecting operator
 * @param operatorRole - Role of rejecting operator
 * @param reason - Reason for rejection
 * @returns Rejection confirmation
 */
export async function rejectStripeOperation(
  stripeEventId: string,
  operatorId: string,
  operatorRole: string,
  reason?: string
): Promise<StripeApprovalDecision> {
  try {
    // Log rejection
    console.log('[STRIPE-APPROVAL] Rejecting operation:', {
      stripe_event_id: stripeEventId,
      operator_id: operatorId,
      reason,
    });

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { persistSession: false } }
    );

    // Fetch approval from stripe_operation_audits
    const { data: approval, error: fetchError } = await supabase
      .from('stripe_operation_audits')
      .select('*')
      .eq('stripe_event_id', stripeEventId)
      .eq('dsg_decision', 'REVIEW')
      .single();

    if (fetchError || !approval) {
      return {
        ok: false,
        error: 'approval_not_found_or_already_decided',
      };
    }

    // Update stripe_operation_audits to status='rejected'
    const { error: updateError } = await supabase
      .from('stripe_operation_audits')
      .update({
        status: 'reviewed',
        dsg_decision: 'BLOCK',
        dsg_reason: reason || 'Rejected by operator',
        payload: {
          ...approval.payload,
          rejected_by: operatorId,
          rejected_at: new Date().toISOString(),
          rejector_role: operatorRole,
          rejection_reason: reason,
        },
      })
      .eq('stripe_event_id', stripeEventId);

    if (updateError) {
      console.error('[STRIPE-APPROVAL] Failed to update rejection:', updateError);
      return {
        ok: false,
        error: updateError.message || 'rejection_update_failed',
      };
    }

    return {
      ok: true,
      stripe_event_id: stripeEventId,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'rejection_failed',
    };
  }
}

/**
 * List pending Stripe operation approvals for an account
 *
 * Returns all Stripe operations awaiting operator review.
 *
 * SCAFFOLD: Basic structure only.
 * Implementation: Query stripe_operation_audits with status='review'.
 *
 * @param orgId - DSG organization ID
 * @returns List of pending approvals
 */
export async function listPendingStripeApprovals(orgId: string) {
  try {
    // Log query
    console.log('[STRIPE-APPROVAL] Listing pending approvals for org:', orgId);

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { persistSession: false } }
    );

    // Query stripe_operation_audits for pending approvals
    const { data: audits, error } = await supabase
      .from('stripe_operation_audits')
      .select(
        `
        id,
        stripe_event_id,
        stripe_account_id,
        stripe_object_id,
        operation_type,
        dsg_decision,
        dsg_reason,
        created_at,
        payload,
        stripe_app_accounts(dsg_org_id)
      `
      )
      .eq('dsg_decision', 'REVIEW')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[STRIPE-APPROVAL] Query failed:', error);
      return {
        ok: false,
        error: error.message || 'query_failed',
        approvals: [],
      };
    }

    // Filter by org if provided
    const filtered = audits?.filter((audit: any) => {
      return !orgId || audit.stripe_app_accounts?.dsg_org_id === orgId;
    }) || [];

    return {
      ok: true,
      approvals: filtered,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'query_failed',
      approvals: [],
    };
  }
}

/**
 * Get approval status for a specific Stripe operation
 *
 * Checks if an operation has been approved and returns the approval token if ready for execution.
 *
 * SCAFFOLD: Basic structure only.
 * Implementation: Query stripe_operation_audits by stripe_event_id.
 *
 * @param stripeEventId - Stripe event ID to check
 * @returns Approval status and token if approved
 */
export async function getStripeApprovalStatus(stripeEventId: string) {
  try {
    // Log status check
    console.log('[STRIPE-APPROVAL] Checking approval status:', stripeEventId);

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { persistSession: false } }
    );

    // Query stripe_operation_audits
    const { data: audit, error } = await supabase
      .from('stripe_operation_audits')
      .select('*')
      .eq('stripe_event_id', stripeEventId)
      .single();

    if (error) {
      return {
        ok: false,
        error: error.message || 'query_failed',
      };
    }

    if (!audit) {
      return {
        ok: false,
        error: 'not_found',
      };
    }

    const statusMap: { [key: string]: string } = {
      recorded: 'pending',
      reviewed: audit.dsg_decision === 'ALLOW' ? 'approved' : 'rejected',
      executed: 'executed',
    };

    return {
      ok: true,
      status: statusMap[audit.status as string] || audit.status,
      stripe_event_id: stripeEventId,
      dsg_decision: audit.dsg_decision,
      dsg_reason: audit.dsg_reason,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'query_failed',
    };
  }
}
