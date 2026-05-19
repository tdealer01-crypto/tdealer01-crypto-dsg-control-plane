'use client';

import { useState } from 'react';
import Link from 'next/link';

type SetupState = 'idle' | 'running' | 'done' | 'error';

type SetupResult = {
  ok: boolean;
  api_key?: string;
  agent_id?: string;
  execution_id?: string;
  error?: string;
};

export default function AutoSetupButton() {
  const [state, setState] = useState<SetupState>('idle');
  const [result, setResult] = useState<SetupResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function runSetup() {
    setState('running');
    try {
      const res = await fetch('/api/setup/auto', { method: 'POST' });
      const data = await res.json();
      setResult(data);
      setState(data.ok ? 'done' : 'error');
    } catch {
      setResult({ ok: false, error: 'Network error — please try again.' });
      setState('error');
    }
  }

  function copyKey() {
    if (!result?.api_key) return;
    navigator.clipboard.writeText(result.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (state === 'idle') {
    return (
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="text-3xl">⚡</span>
            <div>
              <h2 className="text-lg font-bold text-white">Quick Setup — ติดตั้งอัตโนมัติ</h2>
              <p className="mt-1 max-w-lg text-sm text-slate-400">
                กดปุ่มเดียว — DSG จะสร้าง agent, policy, API key และรัน execution แรกให้อัตโนมัติ
                ใช้เวลาไม่ถึง 10 วินาที
              </p>
            </div>
          </div>
          <button
            onClick={runSetup}
            className="shrink-0 rounded-xl bg-emerald-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
          >
            ติดตั้งเลย →
          </button>
        </div>
      </div>
    );
  }

  if (state === 'running') {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <div className="flex items-center gap-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <div>
            <p className="font-bold text-white">กำลังติดตั้ง...</p>
            <p className="text-sm text-slate-400">สร้าง agent · ตั้ง policy · รัน execution แรก</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'done' && result) {
    return (
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <h2 className="font-bold text-white">ติดตั้งเสร็จแล้ว — พร้อมใช้งาน</h2>
            <p className="text-sm text-slate-400">Agent, policy และ audit trail ถูกสร้างแล้ว</p>
          </div>
        </div>

        {result.api_key && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-300">
              API Key — เห็นครั้งเดียว บันทึกไว้เลย
            </p>
            <div className="flex items-center gap-3">
              <code className="flex-1 truncate rounded-lg bg-slate-900 px-3 py-2 text-sm font-mono text-emerald-300">
                {result.api_key}
              </code>
              <button
                onClick={copyKey}
                className="shrink-0 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              ใส่ใน header: <code className="text-slate-300">Authorization: Bearer {'<key>'}</code>
            </p>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          {result.agent_id && (
            <div className="rounded-lg bg-slate-800/60 px-3 py-2">
              <span className="text-slate-400">Agent ID: </span>
              <span className="font-mono text-slate-200 text-xs">{result.agent_id}</span>
            </div>
          )}
          {result.execution_id && (
            <div className="rounded-lg bg-slate-800/60 px-3 py-2">
              <span className="text-slate-400">Execution: </span>
              <span className="font-mono text-slate-200 text-xs">{result.execution_id}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/dashboard"
            className="rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-300"
          >
            เปิด Dashboard →
          </Link>
          <Link
            href="/quickstart"
            className="rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-bold text-slate-200 hover:border-slate-400"
          >
            ดู Quickstart →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
      <div className="flex items-start gap-3">
        <span className="text-xl">⚠️</span>
        <div className="flex-1">
          <p className="font-bold text-white">Setup ไม่สำเร็จ</p>
          <p className="mt-1 text-sm text-slate-400">{result?.error ?? 'เกิดข้อผิดพลาด — ลองใหม่อีกครั้ง'}</p>
        </div>
        <button
          onClick={() => { setState('idle'); setResult(null); }}
          className="shrink-0 rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-slate-300 hover:border-slate-400"
        >
          ลองใหม่
        </button>
      </div>
    </div>
  );
}
