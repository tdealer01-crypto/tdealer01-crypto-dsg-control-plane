import { NextResponse } from 'next/server';
import { getEnterpriseMarketplaceReadinessReport } from '@/lib/dsg/marketplace/readiness';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getEnterpriseMarketplaceReadinessReport());
}
