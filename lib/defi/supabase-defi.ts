import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error('Supabase env vars not set');
  return createClient(url, key);
}

export async function upsertDefiAccount(walletAddress: string) {
  const db = getServiceClient();
  const { data, error } = await db
    .from('defi_accounts')
    .upsert({ wallet_address: walletAddress.toLowerCase() }, { onConflict: 'wallet_address' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDefiAccount(walletAddress: string) {
  const db = getServiceClient();
  const { data } = await db
    .from('defi_accounts')
    .select()
    .eq('wallet_address', walletAddress.toLowerCase())
    .maybeSingle();
  return data;
}

export async function getAllDefiAccounts() {
  const db = getServiceClient();
  const { data, error } = await db.from('defi_accounts').select().gt('deposit_usd', 0);
  if (error) throw error;
  return data ?? [];
}

export async function logDefiTxn(
  walletAddress: string,
  type: 'deposit' | 'withdraw' | 'rebalance' | 'yield',
  amountUSD: number,
  opts?: { txHash?: string; protocol?: string; status?: string }
) {
  const db = getServiceClient();
  await db.from('defi_txns').insert({
    wallet_address: walletAddress.toLowerCase(),
    type,
    amount_usd: amountUSD,
    tx_hash: opts?.txHash,
    protocol: opts?.protocol,
    status: opts?.status ?? 'completed',
  });
}

export async function updateUserDeposit(walletAddress: string, depositUSD: number, sharePct: number) {
  const db = getServiceClient();
  await db
    .from('defi_accounts')
    .update({ deposit_usd: depositUSD, share_pct: sharePct })
    .eq('wallet_address', walletAddress.toLowerCase());
}
