import { KUB_RPC_URL } from './config';

export async function ethCall(to: string, data: string): Promise<string> {
  const res = await fetch(KUB_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'eth_call',
      params: [{ to, data }, 'latest'],
    }),
  });
  const json = await res.json() as { result?: string; error?: { message: string } };
  if (json.error) throw new Error(`RPC error: ${json.error.message}`);
  return json.result ?? '0x0';
}

export async function ethGetBalance(address: string): Promise<bigint> {
  const res = await fetch(KUB_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'eth_getBalance',
      params: [address, 'latest'],
    }),
  });
  const json = await res.json() as { result?: string };
  return BigInt(json.result ?? '0x0');
}

// Encode a 0-argument view call: keccak256(sig)[0:4]
// NOTE: The selectors below are illustrative pre-computed values.
// Verify each selector against the actual deployed contract ABI using:
//   ethers.id('functionSig()').slice(0, 10)  — or cast sig <sig> with Foundry
export function encodeSelector(sig: string): string {
  // pre-computed selectors for the functions we need
  const SELECTORS: Record<string, string> = {
    'annualRewardRate()': '0x4a5f5db4',
    'getSupplyApy()': '0x8d8f1e2b',
    'getLpApy()': '0x5b3d9f1a',
  };
  return SELECTORS[sig] ?? '0x00000000';
}

export function decodeUint256(hex: string): bigint {
  return BigInt(hex === '0x' ? '0' : hex);
}
