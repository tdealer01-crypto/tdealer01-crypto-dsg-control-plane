import { NextResponse } from 'next/server';
import {
  getServerWorkflowSnapshot,
  submitServerWorkflowItem,
} from '../../../../../lib/finance-governance/server-memory-store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const caseId = typeof body?.caseId === 'string' && body.caseId.trim().length > 0 ? body.caseId.trim() : 'server-case';

  const result = submitServerWorkflowItem(caseId);

  return NextResponse.json(
    {
      result,
      snapshot: getServerWorkflowSnapshot(),
    },
    {
      status: 200,
    }
  );
}
