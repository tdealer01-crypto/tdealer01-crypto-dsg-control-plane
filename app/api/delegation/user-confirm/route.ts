/**
 * User Confirmation API Route
 *
 * POST /api/delegation/user-confirm/approve/{requestId}
 * POST /api/delegation/user-confirm/reject/{requestId}
 *
 * Handles user approval and rejection of confirmation requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  approveConfirmation,
  rejectConfirmation,
  getConfirmationStatus,
} from '@/lib/user-confirmation-gate';
import { transitionJobState } from '@/lib/delegation/job-state-machine';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

/**
 * POST /api/delegation/user-confirm/approve/{requestId}
 *
 * Approve a confirmation request and transition job to EXECUTING state.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request URL to extract action and requestId
    const pathname = request.nextUrl.pathname;
    const parts = pathname.split('/');
    const lastPart = parts[parts.length - 1];

    // Extract action and requestId from pattern:
    // /api/delegation/user-confirm/approve/{requestId}
    // or /api/delegation/user-confirm/reject/{requestId}
    const actionMatch = pathname.match(/\/(approve|reject)\/([^/?]+)$/);

    if (!actionMatch) {
      return handleApiError(
        '/api/delegation/user-confirm',
        new Error('Invalid request format. Use /approve/{requestId} or /reject/{requestId}'),
        { status: 400 },
      );
    }

    const action = actionMatch[1] as 'approve' | 'reject';
    const requestId = actionMatch[2];

    if (!requestId || !action) {
      return handleApiError(
        '/api/delegation/user-confirm',
        new Error('requestId and action are required'),
        { status: 400 },
      );
    }

    // Get authenticated user from session
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return handleApiError(
        '/api/delegation/user-confirm',
        new Error('Missing or invalid Authorization header'),
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);

    // Initialize Supabase client with user token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return handleApiError(
        '/api/delegation/user-confirm',
        new Error('Invalid authentication token'),
        { status: 401 },
      );
    }

    // Get confirmation request details
    const confirmationStatus = await getConfirmationStatus(requestId, supabase);

    if (!confirmationStatus) {
      return handleApiError(
        '/api/delegation/user-confirm',
        new Error(`Confirmation request ${requestId} not found`),
        { status: 404 },
      );
    }

    // Verify user owns the delegation
    const { data: delegation, error: delegationError } = await supabase
      .from('delegated_agi_jobs')
      .select('job_id, delegation_id, user_id')
      .eq('delegation_id', confirmationStatus.delegation_id)
      .single();

    if (delegationError || !delegation) {
      return handleApiError(
        '/api/delegation/user-confirm',
        new Error('Delegation not found'),
        { status: 404 },
      );
    }

    if (delegation.user_id !== user.id) {
      return handleApiError(
        '/api/delegation/user-confirm',
        new Error('You do not own this delegation'),
        { status: 403 },
      );
    }

    // Check if already processed
    if (confirmationStatus.status === 'APPROVED' || confirmationStatus.status === 'REJECTED') {
      return NextResponse.json(
        {
          error: 'Confirmation already processed',
          status: confirmationStatus.status,
          processedAt: confirmationStatus.approved_at,
        },
        { status: 400 },
      );
    }

    if (confirmationStatus.status === 'EXPIRED') {
      return NextResponse.json(
        {
          error: 'Confirmation request has expired',
          status: 'EXPIRED',
          expiresAt: confirmationStatus.expires_at,
        },
        { status: 400 },
      );
    }

    // Process the action
    let success = false;

    if (action === 'approve') {
      success = await approveConfirmation(requestId, user.id, supabase);

      if (success) {
        // Transition job state from WAITING_USER_CONFIRM to EXECUTING
        const jobStateTransitioned = await transitionJobState(
          confirmationStatus.job_id,
          'EXECUTING',
          supabase,
        );

        if (!jobStateTransitioned) {
          console.warn(`Failed to transition job ${confirmationStatus.job_id} to EXECUTING`);
          // Still return success since the confirmation was approved
        }
      }
    } else if (action === 'reject') {
      success = await rejectConfirmation(requestId, user.id, supabase);

      if (success) {
        // Transition job state from WAITING_USER_CONFIRM to BLOCKED_USER_DENIED
        const jobStateTransitioned = await transitionJobState(
          confirmationStatus.job_id,
          'BLOCKED_USER_DENIED',
          supabase,
        );

        if (!jobStateTransitioned) {
          console.warn(`Failed to transition job ${confirmationStatus.job_id} to BLOCKED_USER_DENIED`);
          // Still return success since the confirmation was rejected
        }
      }
    }

    if (!success) {
      return handleApiError(
        '/api/delegation/user-confirm',
        new Error(`Failed to ${action} confirmation request`),
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        action,
        requestId,
        jobId: confirmationStatus.job_id,
        delegationId: confirmationStatus.delegation_id,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in user-confirm route:', error);
    return handleApiError(
      '/api/delegation/user-confirm',
      error instanceof Error ? error : new Error(String(error)),
      { status: 500 },
    );
  }
}

/**
 * Support both POST methods via dynamic routing.
 * GET is not supported for this endpoint.
 */
export async function GET() {
  return handleApiError(
    '/api/delegation/user-confirm',
    new Error('GET not supported. Use POST /approve/{requestId} or /reject/{requestId}'),
    { status: 405 },
  );
}
