'use client';
import { useEffect, useState } from 'react';

type Domain = { id: string; domain: string; status: string; claim_mode: string; auto_join_mode: string; verification_token: string | null; notes: string | null };

export default function DomainsSettingsPage() {
  const [items, setItems] = useState<Domain[]>([]);
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const load = async () => { const res = await fetch('/api/settings/domains', { cache: 'no-store' }); const j = await res.json(); setItems(j.items || []); };
  useEffect(() => { void load(); }, []);
  async function add() { setLoading(true); await fetch('/api/settings/domains', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ domain }) }); setDomain(''); setLoading(false); await load(); }
  return <main className="min-h-screen bg-slate-950 text-white p-8"><h1 className="text-3xl font-semibold">Domain Governance</h1><p className="text-slate-300 mt-2">Verified domains assert ownership. Approved domains enable policy evaluation.</p><div className="mt-6 flex gap-2"><input value={domain} onChange={(e)=>setDomain(e.target.value)} placeholder="example.com" className="bg-slate-900 border border-slate-700 rounded px-3 py-2"/><button onClick={()=>void add()} disabled={loading} className="bg-emerald-400 text-slate-950 px-4 py-2 rounded">Add domain</button></div><div className="mt-8 space-y-3">{items.map((d)=><div key={d.id} className="border border-slate-800 bg-slate-900 rounded p-4"><p className="font-semibold">{d.domain} <span className="text-xs text-slate-400">({d.status})</span></p><p className="text-sm text-slate-300">Claim mode: {d.claim_mode} · Auto-join mode: {d.auto_join_mode}</p><p className="text-xs text-slate-400 mt-1">Verification token: {d.verification_token || 'pending generation'}</p></div>)}</div><div className="mt-8 text-sm text-slate-400"><p>Verification is an ops/human step in Batch 4. No automated DNS verification is performed.</p></div></main>;
}
