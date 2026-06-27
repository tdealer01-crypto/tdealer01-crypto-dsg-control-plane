import { NextResponse } from 'next/server';
import { getEnterpriseMarketplaceReadinessReport } from '@/lib/dsg/marketplace/readiness';
import { createReadinessScore } from '@/lib/dsg/marketplace/readiness-score';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, generatedAt: new Date().toISOString(), score: createReadinessScore(getEnterpriseMarketplaceReadinessReport()) });
}
