import { NextRequest, NextResponse } from 'next/server';
import { validateApprovalDecision } from '@/lib/validation/approval-validation';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const { id } = await params;

    // Validate request ID format
    if (!id || typeof id !== 'string' || id.length > 255) {
      console.warn('[approval-decision] Invalid ID format:', { id });
      return NextResponse.json(
        {
          error: 'Invalid request ID',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    // Parse JSON with error handling
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[approval-decision] JSON parse error:', {
        id,
        error: parseError instanceof Error ? parseError.message : String(parseError),
        duration: Date.now() - startTime,
      });

      return NextResponse.json(
        {
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON',
        },
        { status: 400 }
      );
    }

    // Validate decision body
    const validation = validateApprovalDecision(body);
    if (!validation.valid) {
      console.warn('[approval-decision] Validation failed:', {
        id,
        errors: validation.errors,
        duration: Date.now() - startTime,
      });

      return NextResponse.json(
        {
          error: 'Request validation failed',
          code: 'VALIDATION_ERROR',
          details: validation.errors.map(e => ({
            field: e.field,
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { decision, reason } = validation.data!;
    const approvedAt = new Date().toISOString();

    // In production:
    // 1. Verify request ID exists and is in 'pending' status
    // 2. Verify caller has permission to approve (org admin or approval role)
    // 3. Update approval_requests status + approved_by + approval_reason
    // 4. If approved: trigger execution/merge workflow
    // 5. Send Slack/email notification to requester
    // 6. Log decision to audit trail with SHA-256 hash
    // 7. Track metrics (approval time, decision rate)

    const approvalEvent = {
      type: 'approval.decided',
      approval_id: id,
      decision,
      decided_at: approvedAt,
    };

    // Fire-and-forget: notification failure must not fail the decision response
    Promise.resolve().then(async () => {
      try {
        const notifyUrl = process.env.NEXT_PUBLIC_APP_URL
          ? `${process.env.NEXT_PUBLIC_APP_URL}/api/notifications`
          : null;
        if (notifyUrl) {
          await fetch(notifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(approvalEvent),
          });
        }
      } catch {
        // Intentionally swallowed — notification is best-effort
      }
    });

    console.log('[approval-decision] Decision recorded', {
      id,
      decision,
      hasReason: !!reason,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          requestId: id,
          decision,
          reason: reason || null,
          status: decision === 'approved' ? 'approved' : 'rejected',
          decisionAt: approvedAt,
        },
      },
      { status: 200 }
    );
  } catch (caught) {
    const duration = Date.now() - startTime;
    const errorMsg = caught instanceof Error ? caught.message : String(caught);

    console.error('[approval-decision] Unexpected error:', {
      error: errorMsg,
      duration,
      stack: caught instanceof Error ? caught.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        requestId: `err_${Date.now()}`,
      },
      { status: 500 }
    );
  }
}
