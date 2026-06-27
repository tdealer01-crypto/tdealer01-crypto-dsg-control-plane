import { NextResponse } from 'next/server';
import { getAllYields } from '../../../../lib/defi/protocols';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  try {
    const yields = await getAllYields();
    const best = yields.reduce((b, y) => (y.apyPct > b.apyPct ? y : b), yields[0]);
    return NextResponse.json({ ok: true, yields, best });
  } catch {
    return NextResponse.json({ ok: false, error: 'YIELDS_INTERNAL_ERROR' }, { status: 500 });
  }
}
