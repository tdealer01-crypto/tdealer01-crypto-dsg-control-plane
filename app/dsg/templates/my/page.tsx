'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, BookOpen, Loader2, ShoppingBag } from 'lucide-react';

type PurchasedTemplate = {
  saleId: string;
  templateId: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  stack: string[];
  priceSatang: number;
  priceTHB: number;
  purchasedAt: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  SaaS: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
  Dashboard: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  'AI/Chat': 'border-violet-500/40 bg-violet-500/10 text-violet-300',
  'E-commerce': 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  'Internal Tools': 'border-slate-500/40 bg-slate-500/10 text-slate-300',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

function formatPrice(priceSatang: number) {
  if (priceSatang === 0) return 'ฟรี';
  return `฿${(priceSatang / 100).toLocaleString('th-TH')}`;
}

export default function MyTemplatesPage() {
  const [purchases, setPurchases] = useState<PurchasedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/dsg/templates/my/purchases')
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setPurchases(res.data ?? []);
        else setError(res.error?.code ?? 'UNKNOWN_ERROR');
      })
      .catch(() => setError('NETWORK_ERROR'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <p>{error === 'DSG_AUTH_REQUIRED' ? 'กรุณาเข้าสู่ระบบ' : `เกิดข้อผิดพลาด: ${error}`}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <section className="rounded-3xl border border-violet-500/20 bg-violet-500/10 p-6 md:p-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-violet-200">
            <BookOpen className="h-3.5 w-3.5" /> My Library
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">Templates ของฉัน</h1>
          <p className="mt-2 text-sm text-slate-300">Templates ที่ซื้อและรับมาทั้งหมด — พร้อมใช้งานใน App Builder</p>
        </section>

        {/* Count */}
        {purchases.length > 0 && (
          <p className="text-sm text-slate-500">{purchases.length} template{purchases.length !== 1 ? 's' : ''}</p>
        )}

        {/* Empty state */}
        {purchases.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900 py-24 text-center">
            <ShoppingBag className="mb-4 h-10 w-10 text-slate-600" />
            <p className="text-lg font-bold text-slate-300">ยังไม่มี templates</p>
            <p className="mt-1 text-sm text-slate-500">ไปดู templates ที่มีให้เลือก</p>
            <a
              href="/dsg/templates"
              className="mt-6 inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-500"
            >
              ดู Templates <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        )}

        {/* Grid */}
        {purchases.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {purchases.map((tmpl) => (
              <div
                key={tmpl.saleId}
                className="flex flex-col rounded-3xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-slate-700"
              >
                {/* Category badge */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-slate-300">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  {tmpl.category && (
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${CATEGORY_COLORS[tmpl.category] ?? 'border-slate-500/40 bg-slate-500/10 text-slate-300'}`}>
                      {tmpl.category}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-black text-slate-100">{tmpl.name}</h3>
                <p className="mt-1 flex-1 text-sm leading-6 text-slate-400">{tmpl.description}</p>

                {/* Stack */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {tmpl.stack.map((tag) => (
                    <span key={tag} className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-[11px] text-slate-400">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500">ซื้อเมื่อ {formatDate(tmpl.purchasedAt)}</span>
                    <span className={`text-xs font-bold ${tmpl.priceSatang === 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {formatPrice(tmpl.priceSatang)}
                    </span>
                  </div>
                  <a
                    href={`/dsg/app-builder?template=${tmpl.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                  >
                    Use template <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
