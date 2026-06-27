import { NextRequest, NextResponse } from 'next/server';
import { validateApprovalRequest } from '@/lib/validation/approval-validation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    // Parse JSON with error handling
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[approval-request] JSON parse error:', {
        ip: clientIp,
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

    // Comprehensive validation
    const validation = validateApprovalRequest(body);
    if (!validation.valid) {
      console.warn('[approval-request] Validation failed:', {
        ip: clientIp,
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

    const { agentId, orgId, action, input, expiresInHours, priority } = validation.data!;

    // Generate request ID and expiry
    const requestId = `areq_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const expiresAt = new Date(Date.now() + expiresInHours * 3600000).toISOString();
    const createdAt = new Date().toISOString();

    // In production:
    // 1. Check org quota (free: 100/month, pro: unlimited)
    // 2. Verify orgId matches auth context
    // 3. Insert into approval_requests table with RLS policy enforcement
    // 4. Trigger Slack/email notification webhook
    // 5. Add to Sentry transaction for monitoring

    console.log('[approval-request] Created successfully', {
      requestId,
      agentId,
      orgId,
      priority,
      expiresInHours,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          requestId,
          agentId,
          action,
          status: 'pending',
          priority,
          expiresAt,
          createdAt,
          timeoutInHours: expiresInHours,
        },
      },
      { status: 201 }
    );
  } catch (caught) {
    const duration = Date.now() - startTime;
    const errorMsg = caught instanceof Error ? caught.message : String(caught);

    console.error('[approval-request] Unexpected error:', {
      ip: clientIp,
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
