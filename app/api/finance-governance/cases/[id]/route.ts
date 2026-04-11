import { NextResponse } from 'next/server';
import { getCaseDetail } from '../../../../../lib/finance-governance/mock-data';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, context: RouteContext) {
  return NextResponse.json({
    case: getCaseDetail(context.params.id),
  });
}
