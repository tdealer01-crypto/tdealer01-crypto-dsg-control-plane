/**
 * User Confirmation Gate
 *
 * Handles pausing execution for HIGH and CRITICAL actions,
 * sending notifications to users, and managing confirmation lifecycle.
 */

import type { AgentWorkStep } from './delegation/types';

export interface ConfirmationRequest {
  request_id?: string;
  job_id: string;
  delegation_id: string;
  step: AgentWorkStep;
  evidence: Record<string, unknown>;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by?: string;
  approved_at?: string;
}

export interface ConfirmationResponse {
  approved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  reason?: string;
}

export interface ConfirmationStatus {
  request_id: string;
  job_id: string;
  delegation_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  created_at: string;
  expires_at: string;
  approved_at?: string;
  approved_by?: string;
}

/**
 * Determine if a work step requires user confirmation.
 *
 * Confirmation is required for:
 * - HIGH risk actions
 * - CRITICAL risk actions
 * - Any action with step.requiresConfirmation = true
 *
 * @param step - Work step to evaluate
 * @returns true if confirmation is required
 */
export function stepRequiresConfirmation(step: AgentWorkStep): boolean {
  if (step.requiresConfirmation) {
    return true;
  }

  return step.risk === 'HIGH' || step.risk === 'CRITICAL';
}

/**
 * Request user confirmation for a work step.
 *
 * Flow:
 * 1. Store confirmation request in database
 * 2. Send notification to user (email/webhook/websocket)
 * 3. Return request ID and await later poll/callback
 *
 * @param context - Confirmation request context
 * @param supabaseClient - Supabase client for DB persistence
 * @returns Confirmation request with ID, or null if failed
 */
export async function requestUserConfirmation(
  context: {
    delegation_id: string;
    job_id: string;
    step: AgentWorkStep;
    evidence: Record<string, unknown>;
    user_email?: string;
  },
  supabaseClient: any,
): Promise<ConfirmationRequest | null> {
  try {
    // Calculate expiration (default 24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Store confirmation request in database
    const { data, error } = await supabaseClient
      .from('user_confirmation_requests')
      .insert({
        job_id: context.job_id,
        delegation_id: context.delegation_id,
        step_json: context.step,
        evidence_json: context.evidence,
        status: 'PENDING',
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      })
      .select('request_id, job_id, delegation_id, status, created_at, expires_at')
      .single();

    if (error || !data) {
      console.error('Failed to create confirmation request:', error);
      return null;
    }

    // TODO: Send notification to user
    // - Email notification with approval/rejection links
    // - Webhook notification to external system
    // - WebSocket notification if user is logged in
    // For now, this is a placeholder for notification integration
    if (context.user_email) {
      console.log(
        `[NOTIFICATION] User ${context.user_email} needs to confirm step ${context.step.stepId}`,
      );
      console.log(`[NOTIFICATION] Request ID: ${data.request_id}`);
      console.log(`[NOTIFICATION] Expires at: ${expiresAt}`);
    }

    return {
      request_id: data.request_id,
      job_id: data.job_id,
      delegation_id: data.delegation_id,
      step: context.step,
      evidence: context.evidence,
      status: data.status,
    };
  } catch (error) {
    console.error('Unexpected error creating confirmation request:', error);
    return null;
  }
}

/**
 * Poll for confirmation status.
 *
 * Called by execution pipeline to check if user has approved/rejected.
 *
 * @param requestId - Confirmation request ID
 * @param supabaseClient - Supabase client
 * @returns Confirmation status, or null if not found
 */
export async function getConfirmationStatus(
  requestId: string,
  supabaseClient: any,
): Promise<ConfirmationStatus | null> {
  try {
    const { data, error } = await supabaseClient
      .from('user_confirmation_requests')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if expired
    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    const status = expiresAt < now ? 'EXPIRED' : data.status;

    return {
      request_id: data.request_id,
      job_id: data.job_id,
      delegation_id: data.delegation_id,
      status,
      created_at: data.created_at,
      expires_at: data.expires_at,
      approved_at: data.approved_at,
      approved_by: data.approved_by,
    };
  } catch (error) {
    console.error(`Error fetching confirmation status for ${requestId}:`, error);
    return null;
  }
}

/**
 * Wait for user confirmation with timeout.
 *
 * Polls the database until:
 * - User approves (returns true)
 * - User rejects (returns false)
 * - Request expires (returns false)
 * - Timeout reached (returns false)
 *
 * @param requestId - Confirmation request ID
 * @param supabaseClient - Supabase client
 * @param timeoutMs - Max time to wait (default 24 hours)
 * @param pollIntervalMs - Poll interval (default 5 seconds)
 * @returns true if approved, false if rejected/expired/timeout
 */
export async function waitForConfirmation(
  requestId: string,
  supabaseClient: any,
  timeoutMs: number = 24 * 60 * 60 * 1000, // 24 hours default
  pollIntervalMs: number = 5000, // 5 seconds default
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const status = await getConfirmationStatus(requestId, supabaseClient);

    if (!status) {
      console.warn(`Confirmation request ${requestId} not found`);
      return false;
    }

    if (status.status === 'APPROVED') {
      return true;
    }

    if (status.status === 'REJECTED' || status.status === 'EXPIRED') {
      return false;
    }

    // Still PENDING, wait and poll again
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  console.warn(`Confirmation request ${requestId} timed out after ${timeoutMs}ms`);
  return false;
}

/**
 * Mark a confirmation request as approved.
 *
 * Called by the approval API route when user confirms.
 *
 * @param requestId - Confirmation request ID
 * @param userId - User ID approving
 * @param supabaseClient - Supabase client
 * @returns true if successful
 */
export async function approveConfirmation(
  requestId: string,
  userId: string,
  supabaseClient: any,
): Promise<boolean> {
  try {
    const { error } = await supabaseClient
      .from('user_confirmation_requests')
      .update({
        status: 'APPROVED',
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('request_id', requestId);

    if (error) {
      console.error(`Failed to approve confirmation ${requestId}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Unexpected error approving confirmation ${requestId}:`, error);
    return false;
  }
}

/**
 * Mark a confirmation request as rejected.
 *
 * Called by the rejection API route when user denies.
 *
 * @param requestId - Confirmation request ID
 * @param userId - User ID rejecting
 * @param supabaseClient - Supabase client
 * @returns true if successful
 */
export async function rejectConfirmation(
  requestId: string,
  userId: string,
  supabaseClient: any,
): Promise<boolean> {
  try {
    const { error } = await supabaseClient
      .from('user_confirmation_requests')
      .update({
        status: 'REJECTED',
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('request_id', requestId);

    if (error) {
      console.error(`Failed to reject confirmation ${requestId}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Unexpected error rejecting confirmation ${requestId}:`, error);
    return false;
  }
}

/**
 * Get all pending confirmation requests for a user.
 *
 * @param userId - User ID to query
 * @param supabaseClient - Supabase client
 * @returns Array of pending confirmation requests
 */
export async function getPendingConfirmations(
  userId: string,
  supabaseClient: any,
): Promise<ConfirmationStatus[]> {
  try {
    const { data, error } = await supabaseClient
      .from('user_confirmation_requests')
      .select('*')
      .eq('status', 'PENDING')
      .in(
        'delegation_id',
        // Get all delegations for this user
        supabaseClient
          .from('delegated_agi_jobs')
          .select('delegation_id')
          .eq('user_id', userId),
      );

    if (error || !data) {
      return [];
    }

    return data.map((item: any) => ({
      request_id: item.request_id,
      job_id: item.job_id,
      delegation_id: item.delegation_id,
      status: item.status,
      created_at: item.created_at,
      expires_at: item.expires_at,
    }));
  } catch (error) {
    console.error(`Error fetching pending confirmations for user ${userId}:`, error);
    return [];
  }
}

/**
 * Clean up expired confirmation requests.
 *
 * Should be called periodically via a cron job.
 *
 * @param supabaseClient - Supabase client
 * @returns Number of expired requests deleted
 */
export async function cleanupExpiredConfirmations(supabaseClient: any): Promise<number> {
  try {
    const now = new Date().toISOString();

    const { data, error: deleteError } = await supabaseClient
      .from('user_confirmation_requests')
      .delete()
      .lt('expires_at', now)
      .neq('status', 'APPROVED')
      .neq('status', 'REJECTED')
      .select('request_id');

    if (deleteError) {
      console.error('Failed to cleanup expired confirmations:', deleteError);
      return 0;
    }

    return data ? data.length : 0;
  } catch (error) {
    console.error('Unexpected error cleaning up confirmations:', error);
    return 0;
  }
}
