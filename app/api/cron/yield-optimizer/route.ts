import { NextRequest, NextResponse } from 'next/server';
import { runYieldOptimizer } from '../../../../lib/defi/yield-optimizer';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await runYieldOptimizer();
    const status = result.action === 'error' ? 500 : 200;
    return NextResponse.json(result, { status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ action: 'error', reason: message, timestamp: new Date().toISOString() }, { status: 500 });
  }
}
