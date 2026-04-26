import { NextRequest, NextResponse } from 'next/server';
import { runReleaseGate } from '../../../../lib/release-gate/checker';
import { hasReleaseGateProAccess } from '../../../../lib/release-gate/entitlements';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const email = req.nextUrl.searchParams.get('email');

  if (!url) {
    return NextResponse.json({ error: 'missing_url' }, { status: 400 });
  }

  let isPro = false;

  if (email) {
    isPro = await hasReleaseGateProAccess(email);
  }

  if (!isPro) {
    return NextResponse.json({
      error: 'pro_required',
      message: 'Upgrade to Release Gate Pro to run full checks'
    }, { status: 402 });
  }

  const result = await runReleaseGate(url);

  return NextResponse.json({
    ...result,
    pro: true
  });
}
