import { NextRequest, NextResponse } from 'next/server';
import { verifyWalletSignature, sendWithdrawal } from '../../../../lib/defi/custodial-wallet';
import { getDefiAccount, updateUserDeposit, logDefiTxn, getAllDefiAccounts } from '../../../../lib/defi/supabase-defi';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json() as { address?: string; message?: string; signature?: string; amountUSD?: number };
  const { address, message, signature, amountUSD } = body;

  if (!address || !message || !signature || !amountUSD) {
    return NextResponse.json({ error: 'address, message, signature, amountUSD required' }, { status: 400 });
  }

  const devMode = process.env.DEFI_DEV_MODE === 'true';
  const verified = await verifyWalletSignature(message, signature);
  if (!devMode && (!verified || verified.toLowerCase() !== address.toLowerCase())) {
    return NextResponse.json({ error: 'signature verification failed' }, { status: 401 });
  }

  const account = await getDefiAccount(address);
  if (!account) return NextResponse.json({ error: 'wallet not registered' }, { status: 404 });
  if (Number(account.deposit_usd) < amountUSD) {
    return NextResponse.json({ error: 'insufficient balance' }, { status: 400 });
  }

  const { txHash, simulated } = await sendWithdrawal(address, amountUSD);

  // Update user's share
  const allAccounts = await getAllDefiAccounts();
  const newDeposit = Number(account.deposit_usd) - amountUSD;
  const totalPool = allAccounts.reduce((s, a) => s + Number(a.deposit_usd), 0) - amountUSD;
  const newShare = totalPool > 0 ? (newDeposit / totalPool) * 100 : 0;
  await updateUserDeposit(address, newDeposit, newShare);
  await logDefiTxn(address, 'withdraw', amountUSD, { txHash, status: simulated ? 'simulated' : 'completed' });

  return NextResponse.json({ ok: true, txHash, simulated, newDepositUSD: newDeposit });
}
