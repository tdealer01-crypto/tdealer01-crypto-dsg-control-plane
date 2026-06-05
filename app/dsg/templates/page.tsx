'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Star, ArrowRight, Zap, ShoppingCart, Loader2 } from 'lucide-react';

type Template = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  stack: string[];
  stars: number;
  popular: boolean;
  price_satang: number;
  seller_id: string | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  SaaS: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
  Dashboard: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  'AI/Chat': 'border-violet-500/40 bg-violet-500/10 text-violet-300',
  'E-commerce': 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  'Internal Tools': 'border-slate-500/40 bg-slate-500/10 text-slate-300',
};

function formatStars(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function formatPrice(priceSatang: number): string {
  if (priceSatang === 0) return 'ฟรี';
  return `฿${(priceSatang / 100).toLocaleString('th-TH', { minimumFractionDigits: 0 })}`;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dsg/templates')
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setTemplates(res.data ?? []);
      })
      .catch(() => {/* silently degrade — grid stays empty */})
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(templates.map((t) => t.category)));
    return ['All', ...cats.sort()];
  }, [templates]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return templates.filter((t) => {
      const matchesCategory = activeCategory === 'All' || t.category === activeCategory;
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.stack.some((s) => s.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [templates, search, activeCategory]);

  async function handlePurchase(template: Template) {
    if (purchasing) return;
    setPurchasing(template.id);
    try {
      const res = await fetch(`/api/dsg/templates/${template.id}/purchase`, { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        if (data.data.checkoutRequired && data.data.checkoutUrl) {
          window.location.assign(data.data.checkoutUrl);
          return;
        } else {
          alert(`ได้รับ template "${template.name}" แล้ว! ไปที่ App Builder เพื่อใช้งาน`);
        }
      } else {
        alert(`ไม่สามารถซื้อได้: ${data.error?.code}`);
      }
    } catch {
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setPurchasing(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <section className="rounded-3xl border border-indigo-500/20 bg-indigo-500/10 p-6 shadow-2xl shadow-indigo-950/30 md:p-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">
            <Zap className="h-3.5 w-3.5" /> App Templates
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-5xl">App Templates</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
            Start building faster with production-ready templates. Pick one, customise it, and ship.
          </p>
        </section>

        {/* Search + filter */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${
                  activeCategory === cat
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        )}

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-slate-500">
            {filtered.length} template{filtered.length !== 1 ? 's' : ''}
            {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
          </p>
        )}

        {/* Grid */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900 py-24 text-center">
            <Search className="mb-4 h-10 w-10 text-slate-600" />
            <p className="text-lg font-bold text-slate-300">No templates found</p>
            <p className="mt-1 text-sm text-slate-500">Try a different search term or category.</p>
            <button
              onClick={() => { setSearch(''); setActiveCategory('All'); }}
              className="mt-6 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-500"
            >
              Clear filters
            </button>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((template) => {
              const isFree = template.price_satang === 0;
              const isBuying = purchasing === template.id;
              return (
                <div
                  key={template.slug}
                  className="flex flex-col rounded-3xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-slate-700"
                >
                  {/* Badges */}
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-slate-300">
                      <ShoppingCart className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      {template.popular && (
                        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                          Popular
                        </span>
                      )}
                      {template.category && (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${CATEGORY_COLORS[template.category] ?? 'border-slate-500/40 bg-slate-500/10 text-slate-300'}`}>
                          {template.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-black text-slate-100">{template.name}</h3>
                  <p className="mt-1 flex-1 text-sm leading-6 text-slate-400">{template.description}</p>

                  {/* Stack */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {template.stack.map((tag) => (
                      <span key={tag} className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-0.5 text-[11px] text-slate-400">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${isFree ? 'text-emerald-400' : 'text-amber-300'}`}>
                        {formatPrice(template.price_satang)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Star className="h-3.5 w-3.5 text-amber-400" />
                        {formatStars(template.stars)}
                      </span>
                    </div>

                    {template.seller_id ? (
                      <button
                        onClick={() => handlePurchase(template)}
                        disabled={isBuying}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
                      >
                        {isBuying ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            {isFree ? 'รับฟรี' : 'ซื้อเลย'}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    ) : (
                      <a
                        href={`/dsg/app-builder?template=${template.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                      >
                        Use template <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
