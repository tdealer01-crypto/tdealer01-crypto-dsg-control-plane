'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CheckItem { name: string; status: 'pass' | 'fail' | 'skip'; detail: string; }
interface ScanResult { ok: boolean; run_id?: string; claim_pass_eligible?: boolean | null; checks?: CheckItem[]; error?: string; }

const STATUS_CLS: Record<string, string> = {
  pass: 'border-emerald-400/20 bg-emerald-400/5 text-emerald-100',
  fail: 'border-red-400/20 bg-red-400/5 text-red-100',
  skip: 'border-slate-700 bg-slate-800/50 text-slate-400',
};
const STATUS_ICON: Record<string, string> = { pass: '✓', fail: '✗', skip: '—' };

export default function ScanForm() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  async function runScan() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/delivery-proof/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ production_url: trimmed }),
      });
      setResult((await res.json()) as ScanResult);
    } catch {
      setResult({ ok: false, error: 'Network error — check URL and try again.' });
    } finally {
      setLoading(false);
    }
  }

  const eligible = result?.claim_pass_eligible;
  const claimCls =
    eligible === true  ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' :
    eligible === false ? 'border-red-400/40 bg-red-400/10 text-red-200' : '';
  const claimText =
    eligible === true  ? 'EVIDENCE COMPLETE' :
    eligible === false ? 'PRODUCTION BLOCKED' : '';

  return (
    <div className="mt-10 rounded-3xl border border-white/15 bg-white/[0.04] p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-200">Live Proof Scan</p>
      <p className="mt-1 text-sm text-slate-400">ใส่ production URL แล้วรัน scan — ไม่ต้อง login</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && runScan()}
          placeholder="https://your-app.vercel.app"
          className="flex-1 rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-300/50 focus:outline-none"
        />
        <button
          onClick={runScan}
          disabled={loading || !url.trim()}
          className="rounded-xl bg-amber-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-200 disabled:opacity-50"
        >
          {loading ? 'Scanning...' : 'Run Scan →'}
        </button>
      </div>

      {result && (
        <div className="mt-5">
          {claimText && (
            <div className={`mb-4 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase ${claimCls}`}>
              {claimText}
            </div>
          )}
          {result.error && <p className="text-sm text-red-400">{result.error}</p>}
          {result.checks && (
            <div className="grid gap-2">
              {result.checks.map((c) => (
                <div key={c.name} className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${STATUS_CLS[c.status] ?? STATUS_CLS.skip}`}>
                  <span className="mt-0.5 font-bold">{STATUS_ICON[c.status] ?? '—'}</span>
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs opacity-70">{c.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {result.run_id && (
            <Link
              href={`/delivery-proof/report/${result.run_id}`}
              className="mt-4 inline-flex rounded-xl border border-amber-300/30 bg-amber-300/10 px-5 py-2.5 text-sm font-semibold text-amber-200 transition hover:border-amber-300/60"
            >
              View Full Report →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
