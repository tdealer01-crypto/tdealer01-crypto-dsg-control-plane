'use client';
import { useEffect, useState } from 'react';

export default function SecuritySettingsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const load = async () => { const qs = new URLSearchParams(); if (start) qs.set('start_date', start); if (end) qs.set('end_date', end); const r = await fetch(`/api/settings/security/audit-events?${qs.toString()}`, { cache: 'no-store' }); const j = await r.json(); setItems(j.items || []); };
  useEffect(() => { void load(); }, []);
  return <main className="min-h-screen bg-slate-950 text-white p-8"><h1 className="text-3xl font-semibold">Security Settings</h1><p className="text-slate-300 mt-2">Recent security events and org-scoped audit export.</p><div className="mt-4 flex gap-2"><input type="date" value={start} onChange={(e)=>setStart(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-3 py-2"/><input type="date" value={end} onChange={(e)=>setEnd(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-3 py-2"/><button onClick={()=>void load()} className="border border-slate-700 rounded px-3 py-2">Filter</button><a href={`/api/settings/security/audit-export?format=json&start_date=${start}&end_date=${end}`} className="border border-slate-700 rounded px-3 py-2">Export JSON</a><a href={`/api/settings/security/audit-export?format=csv&start_date=${start}&end_date=${end}`} className="border border-slate-700 rounded px-3 py-2">Export CSV</a></div><div className="mt-6 space-y-2">{items.map((item, idx)=><div key={idx} className="border border-slate-800 bg-slate-900 rounded p-3 text-sm"><p>{item.event_type} · {item.email || 'n/a'}</p><p className="text-slate-400">{item.created_at}</p></div>)}</div><p className="mt-6 text-sm text-slate-400">Exports are org-scoped, exclude secrets, and are intended for offline review / SIEM ingest.</p></main>;
}
