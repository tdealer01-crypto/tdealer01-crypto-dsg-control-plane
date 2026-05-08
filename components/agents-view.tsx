'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight, Clipboard, Key, Lock, Search, Terminal } from 'lucide-react';

const agentCapabilities = [
  { id: 'app-builder-step-15', name: 'App Builder Planning Agent', status: 'พร้อมใช้งาน', scope: 'Goal, PRD, plan, gate, approval, handoff', proof: 'Step 15 API routes', target: 'chat' },
  { id: 'runtime-step-16', name: 'Action Runtime Executor', status: 'ใช้หลังอนุมัติ', scope: 'สร้าง branch, เขียนไฟล์, เปิด PR', proof: 'GitHub PR evidence', target: 'chat' },
  { id: 'production-claim-gate', name: 'Production Claim Gate', status: 'ประหยัด quota', scope: 'ตรวจ production readiness claim', proof: 'ใช้ Vercel เฉพาะรอบ proof', target: 'proof' },
];

function goTo(hash: string) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function AgentsView() {
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agentCapabilities;
    return agentCapabilities.filter((agent) => `${agent.name} ${agent.status} ${agent.scope} ${agent.proof}`.toLowerCase().includes(q));
  }, [query]);

  async function copyServiceMenu() {
    const text = agentCapabilities.map((agent) => `${agent.name}\n- status: ${agent.status}\n- scope: ${agent.scope}\n- proof: ${agent.proof}`).join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">บริการเอเจนต์</h1>
          <p className="mt-1 text-slate-500">เลือกบริการที่ใช้งานได้จริง: สร้างแผน, อนุมัติ, เปิด PR, หรือเตรียม proof โดยไม่โชว์ key ลับ</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => goTo('chat')} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500">เริ่มใช้ Agent <ArrowRight className="h-4 w-4" /></button>
          <button onClick={() => void copyServiceMenu()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"><Clipboard className="h-4 w-4" /> {copied ? 'คัดลอกแล้ว' : 'Copy services'}</button>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 text-sm leading-7 text-amber-100">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
          <Lock className="h-4 w-4" /> Permission boundary
        </div>
        <p className="mt-3">หน้านี้ไม่เปิดเผย runtime key และไม่ใส่ปุ่มปลอม. ปุ่มทุกตัวพาไปใช้งาน agent, ดู proof หรือคัดลอกเมนูบริการได้จริง.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาบริการ เช่น PR, runtime, production..." className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-10 pr-4 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-500/40" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/50 text-slate-500">
            <tr>
              <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider">Capability</th>
              <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider">Scope</th>
              <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-right">Proof</th>
              <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.map((agent) => {
              const ready = agent.target === 'chat';
              return (
                <tr key={agent.id} className="hover:bg-slate-800/20">
                  <td className="px-6 py-4 font-medium text-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-800">
                        <Terminal className="h-4 w-4 text-indigo-400" />
                      </div>
                      <div>
                        <p>{agent.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-slate-500">{agent.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{agent.scope}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${ready ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/20 bg-amber-500/10 text-amber-200'}`}>
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-slate-500">{agent.proof}</td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => goTo(agent.target)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800">
                      {ready ? 'ใช้งาน' : 'ดู proof'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="mb-2 flex items-center gap-2 font-semibold text-slate-200">
          <Key className="h-4 w-4 text-slate-400" /> Runtime API key
        </h3>
        <p className="mb-4 text-sm text-slate-500">ผู้ใช้ได้ประโยชน์จากการเห็น boundary: key ไม่โชว์ใน UI, action ถูกผูกผ่าน server และหลักฐานออกมาเป็น PR/proof เท่านั้น.</p>
        <div className="flex gap-3">
          <div className="flex flex-1 items-center justify-between rounded border border-slate-800 bg-slate-950 px-4 py-2 font-mono text-sm text-slate-500">
            server-side only
          </div>
          <button onClick={() => goTo('executions')} className="flex items-center gap-2 rounded border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
            ดูหลักฐาน
          </button>
        </div>
      </div>
    </div>
  );
}
