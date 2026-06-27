// Requires: npm install ethers
// Until installed: signature verification is skipped in dev mode

export function getCustodialAddress(): string {
  return process.env.KUB_WALLET_ADDRESS ?? '';
}

export async function verifyWalletSignature(message: string, signature: string): Promise<string | null> {
  try {
    // TODO: Replace with: const { ethers } = await import('ethers'); return ethers.verifyMessage(message, signature);
    // Dev fallback: extract address from signature header if DEFI_DEV_MODE=true
    if (process.env.DEFI_DEV_MODE === 'true') {
      const match = message.match(/address:([0-9a-fA-Fx]+)/);
      return match?.[1] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function sendWithdrawal(toAddress: string, amountUSD: number): Promise<{ txHash: string; simulated: boolean }> {
  const privateKey = process.env.KUB_WALLET_PRIVATE_KEY;
  if (!privateKey) return { txHash: '', simulated: true };
  // TODO: const { ethers } = await import('ethers');
  // const provider = new ethers.JsonRpcProvider(process.env.KUB_CHAIN_RPC_URL, { chainId: 96 });
  // const signer = new ethers.Wallet(privateKey, provider);
  // const kubAmount = ethers.parseEther(String(amountUSD / KUB_PRICE_USD));
  // const tx = await signer.sendTransaction({ to: toAddress, value: kubAmount });
  // const receipt = await tx.wait();
  // return { txHash: receipt.hash, simulated: false };
  void toAddress;
  void amountUSD;
  return { txHash: `sim_${Date.now().toString(16)}`, simulated: true };
}
