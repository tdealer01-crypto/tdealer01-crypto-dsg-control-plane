'use client';

import React, { useEffect, useState } from 'react';

type Item = { id: string; title: string; completed: boolean; created_at: string };

const APP_ID = "4144ccfa-6153-4294-8738-a06e287ae62c";
const APP_TITLE = "DSG App Builder: สร้างแอป PC เสมือนที่มี Windows ต่อเน็ตแล้ว มีจอมอนิเตอร์ในแอป มี remote mouse A";
const APP_SUMMARY = "สร้างแอป PC เสมือนที่มี Windows ต่อเน็ตแล้ว มีจอมอนิเตอร์ในแอป มี remote mouse API ให้ agent จากที่อื่นควบคุมเมาส์ได้ และมี DSG governance ตรวจ invariant ก่อนทุก action พร้อม audit/evidence proof";
const PLAN_HASH = "1a4457705129202c73cb0c63b52aaef2350a6c98364351c2aa436693a90bedc6";
const APPROVAL_HASH = "6ea6917515a5410cb17d096201ac7fca31c1ee9b3373a7515b6e7337697737b8";

export default function GeneratedDsgAppPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState('First governed task');
  const [status, setStatus] = useState('Loading backend evidence…');

  async function loadItems() {
    setStatus('Loading backend evidence…');
    const response = await fetch(`/api/generated-apps/${APP_ID}/items`, { cache: 'no-store' });
    const json = await response.json();
    if (!response.ok || !json.ok) throw new Error(json.error?.message || 'GENERATED_APP_BACKEND_FAILED');
    setItems(json.data.items);
    setStatus('Backend API + database table reachable');
  }

  async function addItem() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const response = await fetch(`/api/generated-apps/${APP_ID}/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
    });
    const json = await response.json();
    if (!response.ok || !json.ok) throw new Error(json.error?.message || 'GENERATED_APP_CREATE_FAILED');
    setTitle('');
    await loadItems();
  }

  useEffect(() => {
    loadItems().catch((error) => setStatus(error instanceof Error ? error.message : 'GENERATED_APP_LOAD_FAILED'));
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-indigo-500/30 bg-indigo-500/10 p-8 shadow-2xl shadow-indigo-950/30">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-200">DSG Generated Full-Stack App</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight">{APP_TITLE}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">{APP_SUMMARY}</p>
          <div className="mt-6 grid gap-3 text-xs font-mono text-slate-400 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">planHash: {PLAN_HASH}</div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">approvalHash: {APPROVAL_HASH}</div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500"
              placeholder="Add a database-backed item"
            />
            <button onClick={() => addItem().catch((error) => setStatus(error instanceof Error ? error.message : 'GENERATED_APP_CREATE_FAILED'))} className="rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-500">
              Add item
            </button>
          </div>
          <p className="mt-4 text-sm text-slate-400">{status}</p>
          <div className="mt-5 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="font-semibold text-slate-100">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
              </div>
            ))}
            {!items.length && <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-500">No rows yet, or database migration has not been applied.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
