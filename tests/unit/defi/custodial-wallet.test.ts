import { describe, it, expect, beforeEach } from 'vitest';
import { getCustodialAddress, verifyWalletSignature, sendWithdrawal } from '@/lib/defi/custodial-wallet';

beforeEach(() => {
  delete process.env.KUB_WALLET_ADDRESS;
  delete process.env.KUB_WALLET_PRIVATE_KEY;
  delete process.env.DEFI_DEV_MODE;
});

describe('getCustodialAddress', () => {
  it('returns env value when set', () => {
    process.env.KUB_WALLET_ADDRESS = '0xDeadBeef';
    expect(getCustodialAddress()).toBe('0xDeadBeef');
  });

  it("returns '' when env is not set", () => {
    expect(getCustodialAddress()).toBe('');
  });
});

describe('verifyWalletSignature', () => {
  it('extracts address from message when DEFI_DEV_MODE=true', async () => {
    process.env.DEFI_DEV_MODE = 'true';
    const result = await verifyWalletSignature('address:0x1234abcd sig:abc', 'anysig');
    expect(result).toBe('0x1234abcd');
  });

  it('returns null when pattern is missing in dev mode', async () => {
    process.env.DEFI_DEV_MODE = 'true';
    const result = await verifyWalletSignature('no-address-here', 'sig');
    expect(result).toBeNull();
  });

  it('returns null when DEFI_DEV_MODE is not set', async () => {
    const result = await verifyWalletSignature('address:0x1234', 'sig');
    expect(result).toBeNull();
  });
});

describe('sendWithdrawal', () => {
  it('returns simulated:true and empty txHash when no private key', async () => {
    const result = await sendWithdrawal('0xRecipient', 100);
    expect(result.simulated).toBe(true);
    expect(result.txHash).toBe('');
  });

  it('does not throw even without private key', async () => {
    await expect(sendWithdrawal('0xRecipient', 50)).resolves.not.toThrow();
  });

  it('returns a non-empty txHash when private key is set (simulated mode)', async () => {
    process.env.KUB_WALLET_PRIVATE_KEY = 'fake-key';
    const result = await sendWithdrawal('0xRecipient', 100);
    expect(result.simulated).toBe(true);
    expect(result.txHash).toBeTruthy();
  });
});
