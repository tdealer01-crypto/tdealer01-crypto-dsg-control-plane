'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type ActivationProof = {
  id: string;
  tier: string;
  subscription_status: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  current_period_start: string | null;
  current_period_end: string | null;
  proof_version: string;
  proof_hash: string;
  created_at: string;
};

type ProofResponse = {
  ok: boolean;
  activated?: boolean;
  proof?: ActivationProof | null;
  message?: string;
  meaning?: string;
  error?: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function BillingActivationProofPage() {
  const [result, setResult] = useState<ProofResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    async function loadProof() {
      attempts += 1;
      try {
        const response = await fetch('/api/billing/activation-proof', {
          cache: 'no-store',
        });
        const data = (await response.json().catch(() => ({}))) as ProofResponse;
        if (cancelled) return;

        if (!response.ok) {
          setResult({ ok: false, error: data.error || 'Activation proof unavailable' });
          setLoading(false);
          return;
        }

        setResult(data);
        setLoading(false);

        // Stripe webhooks can arrive just after Checkout redirects back. Poll for
        // a short bounded window so the customer sees the result without having
        // to refresh manually. We stop as soon as a proof exists.
        if (!data.activated && attempts < 8) {
          timer = setTimeout(loadProof, 1500);
        }
      } catch {
        if (!cancelled) {
          setResult({ ok: false, error: 'Activation proof unavailable' });
          setLoading(false);
        }
      }
    }

    void loadProof();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const proof = result?.proof ?? null;

  async function copyHash() {
    if (!proof?.proof_hash) return;
    try {
      await navigator.clipboard.writeText(proof.proof_hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              Billing Evidence
            </p>
            <h1 className="mt-2 text-3xl font-bold">Subscription Activation Proof</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              ดูว่าการสมัครแบบชำระเงินถูก Stripe ยืนยันและถูกสะท้อนเป็นสิทธิ์ใช้งานใน DSG แล้วหรือยัง โดยไม่ต้องไล่ดู log หรือฐานข้อมูลเอง
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/billing"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
            >
              Billing
            </Link>
            <Link
              href="/pricing#dsg-gate"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
            >
              Pricing
            </Link>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          {loading ? (
            <div className="flex items-center gap-3 text-slate-300">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
              กำลังตรวจหลักฐานการเปิดใช้งาน…
            </div>
          ) : result?.activated && proof ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-300">✓ VERIFIED ACTIVATION</p>
                  <h2 className="mt-1 text-2xl font-bold">{proof.tier.toUpperCase()} is active</h2>
                </div>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
                  {proof.subscription_status}
                </span>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <dt className="text-xs uppercase tracking-wider text-slate-500">Stripe Subscription</dt>
                  <dd className="mt-1 break-all font-mono text-sm text-slate-200">{proof.stripe_subscription_id}</dd>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <dt className="text-xs uppercase tracking-wider text-slate-500">Stripe Customer</dt>
                  <dd className="mt-1 break-all font-mono text-sm text-slate-200">{proof.stripe_customer_id}</dd>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <dt className="text-xs uppercase tracking-wider text-slate-500">Billing Period</dt>
                  <dd className="mt-1 text-sm text-slate-200">
                    {formatDate(proof.current_period_start)} → {formatDate(proof.current_period_end)}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <dt className="text-xs uppercase tracking-wider text-slate-500">Proof Created</dt>
                  <dd className="mt-1 text-sm text-slate-200">{formatDate(proof.created_at)}</dd>
                </div>
              </dl>

              <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-violet-300">Deterministic Proof Hash</p>
                    <p className="mt-2 break-all font-mono text-xs text-slate-300">{proof.proof_hash}</p>
                  </div>
                  <button
                    type="button"
                    onClick={copyHash}
                    className="rounded-lg border border-violet-400/30 px-3 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-400/10"
                  >
                    {copied ? 'Copied' : 'Copy hash'}
                  </button>
                </div>
              </div>
            </>
          ) : result?.ok ? (
            <div>
              <p className="text-sm font-semibold text-amber-300">NOT VERIFIED YET</p>
              <h2 className="mt-1 text-xl font-bold">ยังไม่มี Activation Proof สำหรับ workspace นี้</h2>
              <p className="mt-2 text-sm text-slate-400">
                {result.message || 'ระบบยังไม่พบ paid entitlement ที่มี Stripe customer และ subscription IDs ครบ'}
              </p>
              <p className="mt-3 text-xs text-slate-500">
                ถ้าเพิ่งกลับจาก Checkout หน้านี้จะตรวจซ้ำอัตโนมัติช่วงสั้น ๆ เพื่อรอ webhook โดยไม่สร้างข้อมูลปลอมขึ้นมาเอง
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-red-300">CHECK FAILED</p>
              <p className="mt-2 text-sm text-slate-300">{result?.error || 'Activation proof unavailable'}</p>
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5">
            <h2 className="font-bold text-emerald-200">หลักฐานนี้ยืนยันอะไร</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              ยืนยันว่า DSG มี paid entitlement สถานะ active/trialing ที่ผูกกับ Stripe customer และ subscription จริง และบันทึกหลักฐานแบบ append-only พร้อม SHA-256 hash แล้ว
            </p>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
            <h2 className="font-bold text-amber-200">หลักฐานนี้ไม่ใช่อะไร</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              ไม่ใช่ใบเสร็จรับเงินจาก Stripe และไม่ใช่ใบรับรองว่าลูกค้าหรือระบบผ่านกฎหมาย/มาตรฐานใดโดยอัตโนมัติ หลักฐาน compliance ต้องมาจากการตรวจ DSG แยกต่างหาก
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
