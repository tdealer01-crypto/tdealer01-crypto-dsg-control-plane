import { NextResponse } from 'next/server';
import { getSecurityRbacReport } from '@/lib/dsg/marketplace/security-rbac';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getSecurityRbacReport());
}
