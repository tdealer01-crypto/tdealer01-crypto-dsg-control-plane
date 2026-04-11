import { NextResponse } from 'next/server';
import { resetServerWorkflowState } from '../../../../../lib/finance-governance/server-memory-store';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(resetServerWorkflowState(), {
    status: 200,
  });
}
