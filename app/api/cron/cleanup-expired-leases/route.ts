import { NextResponse } from 'next/server';
import { cleanupExpiredLeases } from '../../../../lib/dsg/brain/lease-persistence';

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

  try {
    const deleted = await cleanupExpiredLeases();
    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    console.error('[cleanup-expired-leases] cron failed:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
