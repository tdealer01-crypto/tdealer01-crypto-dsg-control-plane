import { NextResponse } from 'next/server';
import { getServerWorkflowSnapshot } from '../../../../../lib/finance-governance/server-memory-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getServerWorkflowSnapshot(), {
    status: 200,
  });
}
