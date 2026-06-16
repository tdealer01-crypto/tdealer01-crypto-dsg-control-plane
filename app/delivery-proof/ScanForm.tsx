'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

interface CheckItem { name: string; status: 'pass' | 'fail' | 'skip'; detail: string; }
interface ScanResult { ok: boolean; run_id?: string; claim_result?: string; checks?: CheckItem[]; error?: string; }

const STATUS_CLS: Record<string, string> = {
  pass: 'border-emerald-400/20 bg-emerald-400/5 text-emerald-100',
  fail: 'border-red-400/20 bg-red-400/5 text-red-100',
  skip: 'border-slate-700 bg-slate-800/50 text-slate-400',
};
const STATUS_ICON: Record<string, string> = { pass: '✓', fail: '✗', skip: '—' };

const REMEDIATION: Record<string, string> = {
  'Homepage reachable': 'ตรวจว่า domain ชี้ถูกต้องและ deployment status เป็น Ready',
  'Readiness endpoint': 'เพิ่ม GET /api/readiness ที่ return { ok: true } หรือตรวจ route handler',
  'Health endpoint': 'เพิ่ม GET /api/health ที่ return { ok: true } หรือตรวจ route handler',
  'Auth protected route': 'ตรวจว่า /dashboard redirect ไป /login เมื่อไม่มี session (middleware.ts)',
  'Repo URL present': 'เพิ่ม repo URL ใน html source หรือ meta tag ของ homepage',
};

export default function ScanForm() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function runScan(scanUrl?: string) {
    const trimmed = (scanUrl ?? url).trim();
    if (!trimmed) { inputRef.current?.focus(); return; }
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

  const claimResult = result?.claim_result ?? '';
  const isBlocked = claimResult === 'PRODUCTION BLOCKED';
  const isComplete = claimResult === 'EVIDENCE COMPLETE';
  const claimCls = isComplete
    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
    : isBlocked
    ? 'border-red-400/40 bg-red-400/10 text-red-200'
    : '';

  const failedChecks = result?.checks?.filter(c => c.status === 'fail') ?? [];

  return (
    <div className="mt-10 rounded-3xl border border-white/15 bg-white/[0.04] p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-200">Live Proof Scan</p>
      <p className="mt-1 text-sm text-slate-400">ใส่ production URL แล้วรัน scan — ไม่ต้อง login</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && void runScan()}
          placeholder="https://your-app.vercel.app"
          autoFocus
          className="flex-1 rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-300/50 focus:outline-none"
        />
        <button
          onClick={() => void runScan()}
          disabled={loading || !url.trim()}
          title={!url.trim() ? 'ใส่ URL ก่อนกด Scan' : undefined}
          className="rounded-xl bg-amber-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-700 border-t-transparent" />
              Scanning…
            </span>
          ) : 'Run Scan →'}
        </button>
      </div>
      {!url.trim() && !result && (
        <p className="mt-2 text-xs text-slate-600">ตัวอย่าง: https://your-app.vercel.app</p>
      )}

      {result && (
        <div className="mt-5 space-y-4">
          {/* Claim badge */}
          {claimResult && (
            <div className={`inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase ${claimCls}`}>
              {claimResult}
            </div>
          )}

          {result.error && <p className="text-sm text-red-400">{result.error}</p>}

          {/* Checks list */}
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

          {/* Remediation panel — shown only when blocked */}
          {isBlocked && failedChecks.length > 0 && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/5 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">แก้ไข {failedChecks.length} จุดนี้ แล้ว Rescan</p>
              <ol className="mt-3 space-y-3">
                {failedChecks.map((c, i) => (
                  <li key={c.name} className="flex gap-3 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[10px] font-bold text-red-300">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-red-100">{c.name}</p>
                      <p className="text-xs text-red-300/70">{REMEDIATION[c.name] ?? c.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <button
                onClick={() => void runScan()}
                disabled={loading}
                className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-xs font-bold text-red-200 transition hover:bg-red-400/20 disabled:opacity-40"
              >
                {loading ? 'Scanning…' : 'Rescan ↻'}
              </button>
            </div>
          )}

          {/* Full report link */}
          <div className="flex flex-wrap gap-3">
            {result.run_id && (
              <Link
                href={`/delivery-proof/report/${result.run_id}`}
                className="inline-flex rounded-xl border border-amber-300/30 bg-amber-300/10 px-5 py-2.5 text-sm font-semibold text-amber-200 transition hover:border-amber-300/60"
              >
                View Full Report →
              </Link>
            )}
            {result.run_id && (
              <button
                onClick={() => void runScan()}
                disabled={loading}
                className="inline-flex rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-400 transition hover:text-slate-200 disabled:opacity-40"
              >
                {loading ? 'Scanning…' : 'Rescan ↻'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
