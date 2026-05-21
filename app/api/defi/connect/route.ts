import { NextRequest, NextResponse } from 'next/server';
import { getCustodialAddress, verifyWalletSignature } from '../../../../lib/defi/custodial-wallet';
import { upsertDefiAccount } from '../../../../lib/defi/supabase-defi';
import { getAllYields } from '../../../../lib/defi/protocols';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json() as { address?: string; message?: string; signature?: string };
  const { address, message, signature } = body;

  if (!address || !message || !signature) {
    return NextResponse.json({ error: 'address, message, signature required' }, { status: 400 });
  }

  // Verify wallet ownership
  const verified = await verifyWalletSignature(message, signature);
  const devMode = process.env.DEFI_DEV_MODE === 'true';
  if (!devMode && (!verified || verified.toLowerCase() !== address.toLowerCase())) {
    return NextResponse.json({ error: 'signature verification failed' }, { status: 401 });
  }

  await upsertDefiAccount(address);
  const custodialAddress = getCustodialAddress();
  const yields = await getAllYields().catch(() => []);

  return NextResponse.json({
    ok: true,
    custodialAddress,
    message: `Send KUB to ${custodialAddress} then call /api/defi/deposit/notify with your txHash`,
    yields,
  });
}
