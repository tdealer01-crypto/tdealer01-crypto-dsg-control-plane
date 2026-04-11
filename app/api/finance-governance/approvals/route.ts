import { NextResponse } from 'next/server';
import { getApprovalItems } from '../../../../lib/finance-governance/mock-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    approvals: getApprovalItems(),
  });
}
