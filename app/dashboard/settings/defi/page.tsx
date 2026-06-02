'use client';

import { useEffect, useState } from 'react';

const FIELDS = [
  { key: 'KUB_WALLET_ADDRESS',       label: 'Wallet Address',             placeholder: '0x...' },
  { key: 'KUB_LIQUID_STAKE_ADDRESS', label: 'Liquid Stake Contract',      placeholder: '0x...' },
  { key: 'KUB_LEND_ADDRESS',         label: 'KUB Lend Contract',          placeholder: '0x...' },
  { key: 'KUBSWAP_ROUTER_ADDRESS',   label: 'Kubswap Router Contract',    placeholder: '0x...' },
  { key: 'KKUB_ADDRESS',             label: 'KKUB Token Contract',        placeholder: '0x...' },
  { key: 'KUB_USDT_ADDRESS',         label: 'USDT Contract (KUB chain)',  placeholder: '0x...' },
] as const;

type ConfigMap = Record<string, string>;

export default function DefiSettingsPage() {
  const [config, setConfig]   = useState<ConfigMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/defi/config')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setConfig(d.config ?? {}); })
      .finally(() => setLoading(false));
  }, []);

  function set(key: string, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch('/api/defi/config', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(config),
      });
      const d = await r.json();
      setMsg(d.ok ? { ok: true, text: 'Saved.' } : { ok: false, text: d.error || 'Save failed.' });
    } catch {
      setMsg({ ok: false, text: 'Network error.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="px-6 py-10 text-white"><p className="text-slate-400">Loading...</p></main>;

  const enabled = config['YIELD_OPTIMIZER_ENABLED'] === 'true';

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 text-white">
      <h1 className="text-3xl font-semibold">DeFi Yield Optimizer</h1>
      <p className="mt-2 text-sm text-slate-400">Bitkub Chain (KUB) — configure contract addresses below. Private key must be set in Vercel env vars directly.</p>

      {/* Private key notice */}
      <div className="mt-6 rounded-xl border border-amber-700 bg-amber-950/40 p-4 text-sm text-amber-300">
        <strong>KUB_WALLET_PRIVATE_KEY</strong> — ห้ามใส่ที่นี่ ต้องใส่ใน Vercel → Settings → Environment Variables โดยตรง
      </div>

      {/* Enable toggle */}
      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Yield Optimizer</p>
            <p className="text-sm text-slate-400">เปิด/ปิด cron job ที่รัน rebalance อัตโนมัติ</p>
          </div>
          <button
            type="button"
            onClick={() => set('YIELD_OPTIMIZER_ENABLED', enabled ? 'false' : 'true')}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${enabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
          >
            <span className={`inline-block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : ''}`} />
          </button>
        </div>
      </section>

      {/* Contract address fields */}
      <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-5">
        <h2 className="font-semibold text-lg">Contract Addresses</h2>
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-sm text-slate-300 mb-1">{label}</label>
            <input
              type="text"
              value={config[key] ?? ''}
              onChange={(e) => set(key, e.target.value)}
              placeholder={placeholder}
              spellCheck={false}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
        ))}
      </section>

      {/* Save */}
      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {msg && (
          <span className={`text-sm ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</span>
        )}
      </div>
    </main>
  );
}
