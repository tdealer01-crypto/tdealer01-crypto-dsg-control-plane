import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { evaluateReadiness, getDefaultConfig } from '@/lib/readiness/check-engine';
import { validateReadinessCheckRequest } from '@/lib/validation/readiness-validation';

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
      console.error('[readiness-check] JSON parse error:', {
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

    // Validate request
    const validation = validateReadinessCheckRequest(body);
    if (!validation.valid) {
      console.warn('[readiness-check] Validation failed:', {
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

    const { repoUrl, coveragePercent, approvalCount } = validation.data!;

    // Get org-specific config (for MVP: default)
    // In production: query from readiness_configs table based on org_id
    const config = getDefaultConfig();

    // Evaluate readiness
    const evalStartTime = Date.now();
    const result = await evaluateReadiness(repoUrl, config, coveragePercent, approvalCount);
    const evalDuration = Date.now() - evalStartTime;

    // In production:
    // 1. Get org_id from auth context
    // 2. Save check result to readiness_checks table with RLS enforcement
    // 3. Add to event log for compliance audit
    // 4. If overall status is 'blocked', trigger alert/webhook
    // 5. Track metrics (check count, result distribution)

    console.log('[readiness-check] Evaluated', {
      overallStatus: result.overallStatus,
      blockers: result.blockerCount,
      reviews: result.reviewCount,
      passes: result.passCount,
      checkDuration: evalDuration,
      totalDuration: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
        metadata: {
          repoUrl,
          checkedAt: new Date().toISOString(),
          evaluationDurationMs: evalDuration,
          nextCheckRecommendedAt: new Date(Date.now() + 3600000).toISOString(),
          config: {
            minTestCoveragePercent: config.minTestCoveragePercent,
            requireNApprovals: config.requireNApprovals,
            blockOnSecrets: config.blockOnSecrets,
            blockOnFailedCI: config.blockOnFailedCI,
          },
        },
      },
      { status: 200 }
    );
  } catch (caught) {
    const duration = Date.now() - startTime;
    const errorMsg = caught instanceof Error ? caught.message : String(caught);

    console.error('[readiness-check] Unexpected error:', {
      ip: clientIp,
      error: errorMsg,
      duration,
      stack: caught instanceof Error ? caught.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to evaluate readiness',
        code: 'EVALUATION_ERROR',
        requestId: `err_${Date.now()}`,
      },
      { status: 500 }
    );
  }
}
