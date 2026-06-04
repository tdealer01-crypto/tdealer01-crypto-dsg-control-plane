import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDefaultConfig } from '@/lib/readiness/check-engine';
import { validateReadinessConfig } from '@/lib/validation/readiness-validation';
import type { ReadinessConfig } from '@/lib/readiness/check-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // In production: query from Supabase based on org_id from auth context
    const config = getDefaultConfig();

    console.log('[readiness-config] Fetched', {
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: config,
      orgId: 'default-org',
      createdAt: new Date(Date.now() - 604800000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[readiness-config] Fetch error:', {
      error: errorMsg,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch readiness configuration',
        code: 'FETCH_ERROR',
        requestId: `err_${Date.now()}`,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse JSON with error handling
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[readiness-config] JSON parse error:', {
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

    // Validate configuration
    const validation = validateReadinessConfig(body);
    if (!validation.valid) {
      console.warn('[readiness-config] Validation failed:', {
        errors: validation.errors,
        duration: Date.now() - startTime,
      });

      return NextResponse.json(
        {
          error: 'Configuration validation failed',
          code: 'VALIDATION_ERROR',
          details: validation.errors.map(e => ({
            field: e.field,
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    // Build updated config
    const currentConfig = getDefaultConfig();
    const updatedConfig: ReadinessConfig = {
      minTestCoveragePercent: validation.data?.minTestCoveragePercent ?? currentConfig.minTestCoveragePercent,
      requireNApprovals: validation.data?.requireNApprovals ?? currentConfig.requireNApprovals,
      blockOnSecrets: validation.data?.blockOnSecrets ?? currentConfig.blockOnSecrets,
      blockOnFailedCI: validation.data?.blockOnFailedCI ?? currentConfig.blockOnFailedCI,
      autoMergeOnPass: validation.data?.autoMergeOnPass ?? currentConfig.autoMergeOnPass,
    };

    // In production:
    // 1. Verify org_id from auth context
    // 2. Check if config exists (create if not)
    // 3. Update readiness_configs table with RLS enforcement
    // 4. Log change to audit trail
    // 5. Notify org members of config change

    const changedFields = Object.keys(validation.data || {}).filter(
      key => (currentConfig as Record<string, unknown>)[key] !== (validation.data as Record<string, unknown>)[key]
    );

    console.log('[readiness-config] Updated', {
      changedFields,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      data: updatedConfig,
      message: 'Readiness configuration updated successfully',
      changedFields,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    console.error('[readiness-config] Unexpected error:', {
      error: errorMsg,
      duration,
      stack: error instanceof Error ? error.stack : undefined,
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
