import { NextResponse } from 'next/server';
import { getAgentAppBuilderMarketReport } from '@/lib/dsg/market/agent-app-builder-market';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getAgentAppBuilderMarketReport());
}
