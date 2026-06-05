import { NextResponse } from 'next/server';
import { getEntitlementReport } from '@/lib/dsg/marketplace/entitlement';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getEntitlementReport());
}
