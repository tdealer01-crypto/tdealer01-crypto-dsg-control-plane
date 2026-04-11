import { NextResponse } from 'next/server';
import { buildSubmitResult } from '../../../../lib/finance-governance/actions';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const caseId = typeof body?.caseId === 'string' && body.caseId.trim().length > 0 ? body.caseId.trim() : 'sample-case';

  return NextResponse.json(buildSubmitResult(caseId), {
    status: 200,
  });
}
