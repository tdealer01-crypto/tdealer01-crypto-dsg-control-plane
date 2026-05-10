import { NextResponse } from 'next/server';
import { getDsgActionLayerSnapshot } from '@/lib/dsg/action-layer/multi-flow-orchestrator';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getDsgActionLayerSnapshot());
}
