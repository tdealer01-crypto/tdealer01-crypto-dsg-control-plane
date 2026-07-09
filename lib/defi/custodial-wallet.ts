// Wallet signature verification with ethers.js
// Requires: npm install ethers (listed in package.json dependencies)
// Production mode: uses ethers.verifyMessage for cryptographic verification
// Dev mode: skips verification when DEFI_DEV_MODE=true for testing

export function getCustodialAddress(): string {
  return process.env.KUB_WALLET_ADDRESS ?? '';
}

export async function verifyWalletSignature(message: string, signature: string): Promise<string | null> {
  try {
    // Production signature verification using ethers.js
    if (process.env.DEFI_DEV_MODE !== 'true') {
      const { verifyMessage } = await import('ethers');
      try {
        const recoveredAddress = verifyMessage(message, signature);
        // Validate recovered address is not zero address (invalid signature)
        return recoveredAddress && recoveredAddress !== '0x0000000000000000000000000000000000000000' ? recoveredAddress : null;
      } catch (verifyError) {
        // Invalid signature format or verification failed
        return null;
      }
    }

    // Dev-only fallback: extract address from signature header for testing
    const match = message.match(/address:([0-9a-fA-Fx]+)/);
    return match?.[1] ?? null;
  } catch (err) {
    console.error('Wallet signature verification error:', err);
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
