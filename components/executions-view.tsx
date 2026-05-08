'use client';

import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clipboard, Download, Search, ShieldCheck } from 'lucide-react';

const evidenceRows = [
  { id: 'goal-lock', name: 'Goal lock record', state: 'ได้จาก App Builder API', proof: 'goalHash', action: 'สร้างงานในหน้า สร้างแอป' },
  { id: 'prd-plan', name: 'PRD and proposed plan', state: 'ได้หลัง Generate plan', proof: 'proposed_plan + gate_result', action: 'ตรวจแผนก่อนอนุมัติ' },
  { id: 'approval', name: 'Approval record', state: 'ได้หลังอนุมัติแผน', proof: 'approvalHash', action: 'กดอนุมัติแผน' },
  { id: 'handoff', name: 'Runtime handoff', state: 'ได้หลัง approval', proof: 'planHash + allowed tools', action: 'ส่งเข้า runtime' },
  { id: 'pr', name: 'GitHub PR evidence', state: 'ได้หลัง Create PR', proof: 'pullRequestUrl + branchName', action: 'สร้าง PR แล้ว copy proof JSON' },
  { id: 'deploy', name: 'Preview/Production proof', state: 'ใช้เมื่อจำเป็นเท่านั้น', proof: 'ยังไม่ใช้ Vercel quota', action: 'deploy เฉพาะรอบ proof' },
];

function goTo(hash: string) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function ExecutionsView() {
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return evidenceRows;
    return evidenceRows.filter((row) => `${row.name} ${row.state} ${row.proof} ${row.action}`.toLowerCase().includes(q));
  }, [query]);

  const proofText = useMemo(() => visibleRows.map((row) => `${row.name}: ${row.state} | ${row.proof} | next=${row.action}`).join('\n'), [visibleRows]);

  async function copyEvidenceMap() {
    await navigator.clipboard.writeText(proofText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function downloadEvidenceMap() {
    const blob = new Blob([proofText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'dsg-evidence-map.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">หลักฐานงาน</h1>
          <p className="mt-1 text-slate-500">ค้นหา คัดลอก หรือดาวน์โหลดแผนที่หลักฐาน เพื่อส่งให้ลูกค้า/ทีมตรวจได้ทันที</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => goTo('chat')} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500">สร้าง PR evidence</button>
          <button onClick={() => void copyEvidenceMap()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"><Clipboard className="h-4 w-4" /> {copied ? 'คัดลอกแล้ว' : 'Copy map'}</button>
          <button onClick={downloadEvidenceMap} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"><Download className="h-4 w-4" /> Download</button>
        </div>
      </div>

      <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-5 text-sm leading-7 text-rose-100">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-rose-200">
          <AlertCircle className="h-4 w-4" /> Claim boundary
        </div>
        <p className="mt-3">
          หน้านี้ไม่แสดง execution ปลอม. สิ่งที่ผู้ใช้ทำได้จริงคือค้นหาแผนที่หลักฐาน, copy/download รายการ proof และกลับไปสร้าง GitHub PR ผ่าน flow ที่อนุมัติแล้ว.
        </p>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหา proof เช่น approval, PR, Vercel, handoff..."
            className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-10 pr-4 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-500/40"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/50 text-slate-500">
            <tr>
              <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider">Evidence item</th>
              <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider">Current state</th>
              <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider">Proof field</th>
              <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider">User action</th>
              <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {visibleRows.map((row) => {
              const ready = row.id !== 'deploy';
              return (
                <tr key={row.id} className="hover:bg-slate-800/20">
                  <td className="px-6 py-4 font-medium text-slate-200">{row.name}</td>
                  <td className="px-6 py-4 text-slate-400">{row.state}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{row.proof}</td>
                  <td className="px-6 py-4 text-slate-400">{row.action}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => goTo(ready ? 'chat' : 'proof')} className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${ready ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/25 bg-amber-500/10 text-amber-200'}`}>
                      {ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                      {ready ? 'ไปทำต่อ' : 'รอ proof'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm leading-7 text-slate-400">
        <div className="flex items-center gap-2 font-bold text-slate-200"><ShieldCheck className="h-4 w-4 text-indigo-400" /> ประโยชน์ที่ผู้ใช้เห็นได้</div>
        <p className="mt-2">ผู้ใช้รู้ว่าหลักฐานไหนต้องมี, ต้องกดอะไรต่อ, และสามารถคัดลอก/ดาวน์โหลดหลักฐานเพื่อส่งตรวจได้โดยไม่ต้องเดา.</p>
      </div>
    </div>
  );
}
