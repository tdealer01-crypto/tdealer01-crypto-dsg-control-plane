import { NextResponse } from 'next/server';
import { flushMeterOutbox } from '../../../../lib/billing/metered';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorizeCron(request: Request): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export async function GET(request: Request) {
  const authError = authorizeCron(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get('limit') ?? '100');
  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(Math.floor(limitParam), 500)
    : 100;

  try {
    const result = await flushMeterOutbox(limit);
    const status = result.errors.length > 0 && result.sent === 0 ? 500 : 200;
    return NextResponse.json({ ok: status === 200, ...result }, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[flush-meter-outbox] cron failed:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
