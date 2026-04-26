import { NextRequest, NextResponse } from 'next/server';
import { runReleaseGate } from '../../../../lib/release-gate/checker';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'missing_url' }, { status: 400 });
  }

  const result = await runReleaseGate(url);
  return NextResponse.json(result);
}
