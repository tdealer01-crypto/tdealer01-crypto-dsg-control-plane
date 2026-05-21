import { NextRequest, NextResponse } from 'next/server';
import { getDefiAccount, getAllDefiAccounts } from '../../../../lib/defi/supabase-defi';
import { getAllYields } from '../../../../lib/defi/protocols';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const wallet = req.nextUrl.searchParams.get('wallet');
  if (!wallet) return NextResponse.json({ error: 'wallet param required' }, { status: 400 });

  const [account, allAccounts, yields] = await Promise.all([
    getDefiAccount(wallet),
    getAllDefiAccounts(),
    getAllYields().catch(() => []),
  ]);

  if (!account) return NextResponse.json({ error: 'wallet not registered' }, { status: 404 });

  const totalPoolUSD = allAccounts.reduce((sum, a) => sum + Number(a.deposit_usd), 0);
  const currentProtocol = process.env.YIELD_OPTIMIZER_CURRENT_PROTOCOL ?? 'kub-liquid-stake';
  const currentApy = yields.find((y) => y.protocol === currentProtocol)?.apyPct ?? 0;
  const estimatedDailyUSD = (Number(account.deposit_usd) * currentApy) / 100 / 365;

  return NextResponse.json({
    ok: true,
    wallet: wallet.toLowerCase(),
    depositUSD: Number(account.deposit_usd),
    sharePct: Number(account.share_pct),
    currentProtocol,
    currentApyPct: currentApy,
    estimatedDailyUSD,
    totalPoolUSD,
    joinedAt: account.joined_at,
    yields,
  });
}
