'use client';

import { useState, useEffect, useCallback } from 'react';

interface YieldData { protocol: string; apyPct: number; available: boolean; }
interface Position {
  depositUSD: number; sharePct: number; currentProtocol: string;
  currentApyPct: number; estimatedDailyUSD: number; totalPoolUSD: number;
  yields: YieldData[];
}

export default function DefiPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [custodialAddr, setCustodialAddr] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
  const [yields, setYields] = useState<YieldData[]>([]);
  const [status, setStatus] = useState('');
  const [withdrawAmt, setWithdrawAmt] = useState('');

  useEffect(() => {
    fetch('/api/defi/yields').then(r => r.json()).then(d => setYields(d.yields ?? []));
  }, []);

  const fetchPosition = useCallback(async (addr: string) => {
    const r = await fetch(`/api/defi/position?wallet=${addr}`);
    if (r.ok) setPosition(await r.json());
  }, []);

  async function connectWallet() {
    const eth = (window as unknown as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<string[]> } }).ethereum;
    if (!eth) { setStatus('Install MetaMask or use a Web3 browser'); return; }
    setStatus('Requesting accounts…');
    const [address] = await eth.request({ method: 'eth_requestAccounts' });
    const ts = Date.now();
    const message = `Connect to DSG Yield Optimizer\naddress:${address}\ntimestamp:${ts}`;
    setStatus('Sign message in wallet…');
    const [signature] = await eth.request({ method: 'personal_sign', params: [message, address] });
    setStatus('Registering…');
    const res = await fetch('/api/defi/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, message, signature }),
    });
    const data = await res.json();
    if (!res.ok) { setStatus(data.error); return; }
    setWallet(address);
    setCustodialAddr(data.custodialAddress);
    await fetchPosition(address);
    setStatus('');
  }

  async function requestWithdraw() {
    if (!wallet || !withdrawAmt) return;
    const eth = (window as unknown as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<string[]> } }).ethereum;
    if (!eth) return;
    const amountUSD = parseFloat(withdrawAmt);
    const message = `Withdraw $${amountUSD} USD\naddress:${wallet}\ntimestamp:${Date.now()}`;
    const [signature] = await eth.request({ method: 'personal_sign', params: [message, wallet] });
    const res = await fetch('/api/defi/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: wallet, message, signature, amountUSD }),
    });
    const data = await res.json();
    setStatus(data.ok ? `Withdrawal submitted: ${data.txHash}` : data.error);
    if (data.ok) await fetchPosition(wallet);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">DSG Yield Optimizer</h1>
      <p className="text-gray-400 text-sm mb-6">KUB Chain • Governed by Z3-proven policy</p>

      {/* APY Table */}
      <div className="bg-gray-900 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Live APYs</h2>
        {yields.length === 0 ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-gray-500"><th className="text-left py-1">Protocol</th><th className="text-right">APY</th><th className="text-right">Status</th></tr></thead>
            <tbody>
              {yields.map((y) => (
                <tr key={y.protocol} className="border-t border-gray-800">
                  <td className="py-2">{y.protocol}</td>
                  <td className="text-right font-mono text-green-400">{y.apyPct.toFixed(2)}%</td>
                  <td className="text-right">{y.available ? '✅' : '⚙️ setup'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Connect / Position */}
      {!wallet ? (
        <button onClick={connectWallet} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl">
          Connect Wallet
        </button>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Connected</p>
            <p className="font-mono text-sm break-all">{wallet}</p>
          </div>

          {custodialAddr && (
            <div className="bg-blue-950 border border-blue-800 rounded-xl p-4">
              <p className="text-xs text-blue-400 mb-1">Deposit KUB to this address</p>
              <p className="font-mono text-xs break-all text-blue-200">{custodialAddr}</p>
            </div>
          )}

          {position && (
            <div className="bg-gray-900 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Your deposit</span><span className="font-mono">${position.depositUSD.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Pool share</span><span className="font-mono">{position.sharePct.toFixed(3)}%</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Current protocol</span><span>{position.currentProtocol}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">APY</span><span className="text-green-400 font-mono">{position.currentApyPct.toFixed(2)}%</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Est. daily earn</span><span className="text-green-400 font-mono">${position.estimatedDailyUSD.toFixed(4)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Total pool</span><span className="font-mono">${position.totalPoolUSD.toFixed(2)}</span></div>
            </div>
          )}

          <div className="bg-gray-900 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-2">Withdraw</p>
            <div className="flex gap-2">
              <input type="number" value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)}
                placeholder="Amount USD" className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none" />
              <button onClick={requestWithdraw} className="bg-red-700 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-semibold">
                Withdraw
              </button>
            </div>
          </div>
        </div>
      )}

      {status && <p className="mt-4 text-sm text-yellow-400">{status}</p>}

      <p className="mt-8 text-xs text-gray-600 text-center">
        Transactions validated by Z3 SMT Solver • Max $1,000/tx • Max $10,000/day
      </p>
    </div>
  );
}
