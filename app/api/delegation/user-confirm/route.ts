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
        {
          code: 'INVALID_REQUEST',
          message: 'Invalid request format. Use /approve/{requestId} or /reject/{requestId}',
          status: 400,
        },
        request,
      );
    }

    const action = actionMatch[1] as 'approve' | 'reject';
    const requestId = actionMatch[2];

    if (!requestId || !action) {
      return handleApiError(
        {
          code: 'MISSING_PARAMS',
          message: 'requestId and action are required',
          status: 400,
        },
        request,
      );
    }

    // Get authenticated user from session
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return handleApiError(
        {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization header',
          status: 401,
        },
        request,
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
        {
          code: 'UNAUTHORIZED',
          message: 'Invalid authentication token',
          status: 401,
        },
        request,
      );
    }

    // Get confirmation request details
    const confirmationStatus = await getConfirmationStatus(requestId, supabase);

    if (!confirmationStatus) {
      return handleApiError(
        {
          code: 'NOT_FOUND',
          message: `Confirmation request ${requestId} not found`,
          status: 404,
        },
        request,
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
        {
          code: 'NOT_FOUND',
          message: 'Delegation not found',
          status: 404,
        },
        request,
      );
    }

    if (delegation.user_id !== user.id) {
      return handleApiError(
        {
          code: 'FORBIDDEN',
          message: 'You do not own this delegation',
          status: 403,
        },
        request,
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
        {
          code: 'INTERNAL_ERROR',
          message: `Failed to ${action} confirmation request`,
          status: 500,
        },
        request,
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
      {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        status: 500,
      },
      request,
    );
  }
}

/**
 * Support both POST methods via dynamic routing.
 * GET is not supported for this endpoint.
 */
export async function GET() {
  return handleApiError(
    {
      code: 'METHOD_NOT_ALLOWED',
      message: 'GET not supported. Use POST /approve/{requestId} or /reject/{requestId}',
      status: 405,
    },
    new NextRequest('http://localhost'),
  );
}
