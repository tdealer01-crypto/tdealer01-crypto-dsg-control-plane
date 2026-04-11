import { NextResponse } from 'next/server';
import { buildApprovalActionResult } from '../../../../../../../lib/finance-governance/actions';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(_request: Request, context: RouteContext) {
  return NextResponse.json(buildApprovalActionResult('escalate', context.params.id), {
    status: 200,
  });
}
