'use client';

import { useEffect, useState } from 'react';

type ToolItem = {
  id: string;
  title: string;
  description: string;
  method: 'GET' | 'POST';
  path: string;
  scope: 'read' | 'write' | 'critical';
  requiredRole: string;
};

const scopeBadge: Record<ToolItem['scope'], string> = {
  read: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  write: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  critical: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
};

export default function SkillsPage() {
  const [items, setItems] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadTools() {
      try {
        setLoading(true);
        setError('');
        const response = await fetch('/api/agent-tools', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load tool registry');
        }

        if (!active) return;
        setItems(Array.isArray(payload?.items) ? payload.items : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load tool registry');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTools();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">DSG Agent</p>
          <h1 className="mt-3 text-4xl font-bold">Tool Registry</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            แสดงรายการ DSG tools ที่ใช้งานจริงจากระบบ agent registry พร้อม scope และสิทธิ์ที่ต้องใช้
            สำหรับแต่ละเครื่องมือ.
          </p>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Registered Tools</h2>
            <span className="text-xs text-slate-400">
              {loading ? 'loading…' : `${items.length} tool(s)`}
            </span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-slate-400">Loading tool registry…</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-slate-400">No tools found.</p>
            ) : (
              items.map((tool) => (
                <article key={tool.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-100">{tool.title}</h3>
                      <p className="mt-1 text-sm text-slate-300">{tool.description}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-semibold uppercase tracking-wide ${scopeBadge[tool.scope]}`}
                    >
                      {tool.scope}
                    </span>
                  </div>

                  <dl className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-3">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Tool ID</dt>
                      <dd className="font-mono text-emerald-300">{tool.id}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Endpoint</dt>
                      <dd className="font-mono">{tool.method} {tool.path}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Required Role</dt>
                      <dd>{tool.requiredRole}</dd>
                    </div>
                  </dl>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
