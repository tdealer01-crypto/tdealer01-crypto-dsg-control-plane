import { NextResponse } from 'next/server';
import { getAllYields } from '../../../../lib/defi/protocols';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  try {
    const yields = await getAllYields();
    const best = yields.reduce((b, y) => (y.apyPct > b.apyPct ? y : b), yields[0]);
    return NextResponse.json({ ok: true, yields, best });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
