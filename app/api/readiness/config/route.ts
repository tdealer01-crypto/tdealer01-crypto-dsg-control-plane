import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDefaultConfig } from '@/lib/readiness/check-engine';
import type { ReadinessConfig } from '@/lib/readiness/check-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // For MVP: return default config for all orgs
    // Production: query readiness_configs table filtered by org_id from auth context
    const config = getDefaultConfig();

    return NextResponse.json({
      success: true,
      data: config,
      orgId: 'default-org', // Would be extracted from session in production
      createdAt: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Config fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch readiness config' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      minTestCoveragePercent,
      requireNApprovals,
      blockOnSecrets,
      blockOnFailedCI,
      autoMergeOnPass,
    }: Partial<ReadinessConfig> = body;

    // Validate inputs
    if (minTestCoveragePercent !== undefined) {
      if (minTestCoveragePercent < 0 || minTestCoveragePercent > 100) {
        return NextResponse.json(
          { error: 'minTestCoveragePercent must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    if (requireNApprovals !== undefined) {
      if (requireNApprovals < 1 || requireNApprovals > 10) {
        return NextResponse.json(
          { error: 'requireNApprovals must be between 1 and 10' },
          { status: 400 }
        );
      }
    }

    // Build updated config
    const currentConfig = getDefaultConfig();
    const updatedConfig: ReadinessConfig = {
      minTestCoveragePercent: minTestCoveragePercent ?? currentConfig.minTestCoveragePercent,
      requireNApprovals: requireNApprovals ?? currentConfig.requireNApprovals,
      blockOnSecrets: blockOnSecrets ?? currentConfig.blockOnSecrets,
      blockOnFailedCI: blockOnFailedCI ?? currentConfig.blockOnFailedCI,
      autoMergeOnPass: autoMergeOnPass ?? currentConfig.autoMergeOnPass,
    };

    // In production: update readiness_configs table for the org
    // await supabase
    //   .from('readiness_configs')
    //   .update(updatedConfig)
    //   .eq('org_id', orgId)
    //   .select()
    //   .single();

    return NextResponse.json({
      success: true,
      data: updatedConfig,
      message: 'Readiness configuration updated',
      changedFields: Object.keys(body),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Config update error:', error);
    return NextResponse.json(
      { error: 'Failed to update readiness config' },
      { status: 500 }
    );
  }
}
