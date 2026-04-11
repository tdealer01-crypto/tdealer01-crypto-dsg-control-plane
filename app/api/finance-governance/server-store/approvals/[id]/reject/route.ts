import { NextResponse } from 'next/server';
import {
  applyApprovalAction,
  getServerWorkflowSnapshot,
} from '../../../../../../../lib/finance-governance/server-memory-store';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(_request: Request, context: RouteContext) {
  const result = applyApprovalAction(context.params.id, 'reject');

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
