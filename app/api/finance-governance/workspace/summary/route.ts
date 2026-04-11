import { NextResponse } from 'next/server';
import { getWorkspaceSummary } from '../../../../../lib/finance-governance/mock-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    workspace: getWorkspaceSummary(),
  });
}
