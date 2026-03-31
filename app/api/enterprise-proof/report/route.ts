import { NextResponse } from 'next/server';
import { buildPublicProofReport } from '../../../../lib/enterprise/proof-public';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(buildPublicProofReport());
}
