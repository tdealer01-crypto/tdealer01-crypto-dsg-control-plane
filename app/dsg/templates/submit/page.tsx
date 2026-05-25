'use client';

import React, { useState } from 'react';
import { UploadCloud, CheckCircle, Loader2, ArrowRight } from 'lucide-react';

const CATEGORIES = ['SaaS', 'Dashboard', 'AI/Chat', 'E-commerce', 'Internal Tools'];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function SubmitTemplatePage() {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    category: '',
    stack: '',
    priceTHB: '0',
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; id?: string; error?: string } | null>(null);

  function handleNameChange(name: string) {
    setForm((f) => ({
      ...f,
      name,
      slug: slugEdited ? f.slug : slugify(name),
    }));
  }

  function handleSlugChange(slug: string) {
    setSlugEdited(true);
    setForm((f) => ({ ...f, slug: slugify(slug) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/dsg/templates/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: form.slug,
          name: form.name,
          description: form.description,
          category: form.category,
          stack: form.stack.split(',').map((s) => s.trim()).filter(Boolean),
          price_satang: Math.round(parseFloat(form.priceTHB || '0') * 100),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult({ ok: true, id: data.data?.id });
      } else {
        setResult({ ok: false, error: data.error?.code ?? 'SUBMIT_FAILED' });
      }
    } catch {
      setResult({ ok: false, error: 'NETWORK_ERROR' });
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.ok) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-8 text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
          <h2 className="text-2xl font-black text-slate-100">ส่ง Template สำเร็จ!</h2>
          <p className="mt-2 text-sm text-slate-400">Template ของคุณถูกลงทะเบียนในระบบแล้ว</p>
          <div className="mt-6 flex justify-center gap-3">
            <a
              href="/dsg/templates"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-500"
            >
              ดู Marketplace <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/dsg/templates/my-payouts"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-700 px-5 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-800"
            >
              Creator Earnings
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <section className="rounded-3xl border border-violet-500/20 bg-violet-500/10 p-6 md:p-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-violet-200">
            <UploadCloud className="h-3.5 w-3.5" /> Sell Template
          </div>
          <h1 className="text-3xl font-black tracking-tight">วาง Template ขาย</h1>
          <p className="mt-2 text-sm text-slate-300">
            Creator ได้รับ 80% ของราคาขาย — platform fee 20%
          </p>
        </section>

        {/* Error banner */}
        {result && !result.ok && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            เกิดข้อผิดพลาด: {result.error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              ชื่อ Template *
            </label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="เช่น SaaS Starter Kit"
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Slug (URL identifier) *
            </label>
            <input
              required
              type="text"
              value={form.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="saas-starter-kit"
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              คำอธิบาย *
            </label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="อธิบายสิ่งที่ template นี้ทำ และเหมาะกับใคร"
              className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              หมวดหมู่ *
            </label>
            <select
              required
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-500"
            >
              <option value="">เลือกหมวดหมู่</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Stack */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Tech Stack (คั่นด้วย comma)
            </label>
            <input
              type="text"
              value={form.stack}
              onChange={(e) => setForm((f) => ({ ...f, stack: e.target.value }))}
              placeholder="Next.js, Supabase, Stripe"
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
          </div>

          {/* Price */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              ราคา (THB) — ใส่ 0 สำหรับฟรี
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">฿</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.priceTHB}
                onChange={(e) => setForm((f) => ({ ...f, priceTHB: e.target.value }))}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 py-3 pl-8 pr-4 text-sm text-slate-100 outline-none focus:border-indigo-500"
              />
            </div>
            {parseFloat(form.priceTHB) > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                Creator ได้รับ ฿{(parseFloat(form.priceTHB) * 0.8).toFixed(0)} (80%) — platform ฿{(parseFloat(form.priceTHB) * 0.2).toFixed(0)} (20%)
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <><UploadCloud className="h-4 w-4" /> ส่ง Template</>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
