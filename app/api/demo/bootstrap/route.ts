import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: 'Demo bootstrap endpoint has been removed',
      code: 'DEMO_BOOTSTRAP_REMOVED',
    },
    { status: 410 }
  );
}
