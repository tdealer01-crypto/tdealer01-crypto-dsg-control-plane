import { NextRequest, NextResponse } from 'next/server';
import { runYieldOptimizerForAllUsers } from '../../../../lib/defi/yield-optimizer';
import { updateUserDeposit, getAllDefiAccounts } from '../../../../lib/defi/supabase-defi';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { optimizerResult, userUpdates } = await runYieldOptimizerForAllUsers();

    // After optimization, recalculate all users' share_pct against the new total pool
    if (userUpdates.length > 0) {
      const allAccounts = await getAllDefiAccounts();
      const newTotalPoolUSD = allAccounts.reduce((s, a) => s + Number(a.deposit_usd), 0);
      if (newTotalPoolUSD > 0) {
        await Promise.all(
          allAccounts.map((account) =>
            updateUserDeposit(
              account.wallet_address,
              Number(account.deposit_usd),
              (Number(account.deposit_usd) / newTotalPoolUSD) * 100
            )
          )
        );
      }
    }

    const status = optimizerResult.action === 'error' ? 500 : 200;
    return NextResponse.json(
      { ...optimizerResult, userUpdates, usersProcessed: userUpdates.length },
      { status }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json(
      { action: 'error', reason: message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
