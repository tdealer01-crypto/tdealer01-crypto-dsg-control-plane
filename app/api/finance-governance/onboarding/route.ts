import { NextResponse } from 'next/server';
import { getOnboardingSteps } from '../../../../lib/finance-governance/mock-data';
import { resolveOrgId } from '../../../../lib/finance-governance/org-scope';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    resolveOrgId(request);
    return NextResponse.json({
      steps: getOnboardingSteps(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    const status = message === 'missing_org_id' ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
