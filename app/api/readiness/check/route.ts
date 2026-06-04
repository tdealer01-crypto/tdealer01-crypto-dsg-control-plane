import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { evaluateReadiness, getDefaultConfig } from '@/lib/readiness/check-engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoUrl, coveragePercent = 82, approvalCount = 1 } = body;

    if (!repoUrl) {
      return NextResponse.json(
        { error: 'repoUrl is required' },
        { status: 400 }
      );
    }

    // For MVP: use default config. Production would query org-specific config from Supabase
    const config = getDefaultConfig();

    const result = await evaluateReadiness(repoUrl, config, coveragePercent, approvalCount);

    // In production: save check result to readiness_checks table
    // await supabase
    //   .from('readiness_checks')
    //   .insert({
    //     org_id: orgId,
    //     check_type: 'full_scan',
    //     status: result.overallStatus,
    //     details: result,
    //     created_at: new Date().toISOString(),
    //   });

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        repoUrl,
        checkedAt: new Date().toISOString(),
        nextCheckRecommended: new Date(Date.now() + 3600000).toISOString(),
      },
    });
  } catch (error) {
    console.error('Readiness check error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate readiness' },
      { status: 500 }
    );
  }
}
