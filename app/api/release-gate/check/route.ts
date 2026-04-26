import { NextRequest, NextResponse } from 'next/server';
import { runReleaseGate } from '../../../../lib/release-gate/checker';
import { hasPro } from '../../../../lib/release-gate/entitlements';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const email = req.nextUrl.searchParams.get('email');

  if (!url) {
    return NextResponse.json({ error: 'missing_url' }, { status: 400 });
  }

  const isPro = email ? await hasPro(email) : false;

  if (!isPro) {
    return NextResponse.json(
      {
        error: 'pro_required',
        message: 'Upgrade to Release Gate Pro',
      },
      { status: 402 }
    );
  }

  const result = await runReleaseGate(url);

  return NextResponse.json({
    ...result,
    pro: true,
  });
}
