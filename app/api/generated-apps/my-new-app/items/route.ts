import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';

export async function GET(req: NextRequest) {
  try {
    await requireVerifiedDsgActor(req.headers, 'read:generated-apps');
    return NextResponse.json({ ok: false, error: { code: 'DATA_SOURCE_NOT_WIRED' } }, { status: 501 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GENERATED_APP_REQUEST_FAILED';
    const status = message === 'DSG_AUTH_REQUIRED' || message === 'DSG_PERMISSION_DENIED' ? 403 : 500;
    return NextResponse.json({ ok: false, error: { code: message } }, { status });
  }
}
