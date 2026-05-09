'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clipboard, ExternalLink, Key, Lock, Play, RefreshCw, Search, Terminal } from 'lucide-react';

type RuntimeServiceStatus = 'available' | 'approval_required' | 'connector_required' | 'quota_gated';
type RuntimeService = {
  id: string;
  label: string;
  description: string;
  status: RuntimeServiceStatus;
  implementation: string;
  action: string;
  endpoint?: string;
  requiredSecrets: string[];
  evidence: string[];
  userBenefit: string;
  truthBoundary: string;
};

type ApiResult = {
  ok: boolean;
  data?: {
    services: RuntimeService[];
    truthBoundary: string;
  };
};

const fallbackServices: RuntimeService[] = [
  {
    id: 'dsg.app_builder.launch_agent_runtime',
    label: 'Launch App Builder agent runtime',
    description: 'Approved runtime launcher for App Builder jobs.',
    status: 'approval_required',
    implementation: 'server_tool_call',
    action: 'Use from the App Builder flow after approval.',
    endpoint: '/api/dsg/app-builder/jobs/:jobId/tool-call',
    requiredSecrets: ['GITHUB_TOKEN'],
    evidence: ['runtime-environment-manifest', 'action-layer-contract', 'audit-event'],
    userBenefit: 'Controlled execution with visible proof.',
    truthBoundary: 'Runtime evidence only. Not production proof.',
  },
  {
    id: 'browser.local.open_url',
    label: 'Open generated app in this browser',
    description: 'Client-side browser inspection action for manual proof.',
    status: 'available',
    implementation: 'client_browser_action',
    action: 'Open URL from this screen.',
    requiredSecrets: [],
    evidence: ['manual-screenshot', 'user-visible-url'],
    userBenefit: 'Inspect a page now without using remote browser quota.',
    truthBoundary: 'Local browser only, not autonomous remote browser.',
  },
  {
    id: 'remote.browser.session',
    label: 'Remote browser session',
    description: 'Manus-style remote browser automation contract for future executor integration.',
    status: 'connector_required',
    implementation: 'not_implemented_in_repo',
    action: 'Connect a real remote browser executor before enabling autonomous browsing.',
    requiredSecrets: ['REMOTE_BROWSER_ENDPOINT_OR_VENDOR_TOKEN'],
    evidence: ['browser-session-id', 'screenshot-url', 'navigation-log'],
    userBenefit: 'Future autonomous page inspection with browser proof.',
    truthBoundary: 'Remote browser executor not found in this repo yet.',
  },
];

function goTo(hash: string) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function statusClass(status: RuntimeServiceStatus) {
  if (status === 'available') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';
  if (status === 'approval_required') return 'border-[#d6a63a]/30 bg-[#d6a63a]/10 text-[#f5d27a]';
  if (status === 'quota_gated') return 'border-amber-500/25 bg-amber-500/10 text-amber-200';
  return 'border-slate-700 bg-slate-800 text-slate-300';
}

function serviceActionLabel(service: RuntimeService) {
  if (service.id === 'browser.local.open_url') return 'เปิด URL';
  if (service.status === 'available') return 'ใช้งาน';
  if (service.status === 'approval_required') return 'ไปอนุมัติ';
  if (service.status === 'quota_gated') return 'ดู proof ก่อน';
  return 'Copy contract';
}

export function AgentsView() {
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [services, setServices] = useState<RuntimeService[]>(fallbackServices);
  const [loading, setLoading] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('/product-ready');
  const [truthBoundary, setTruthBoundary] = useState('Remote browser automation requires a real connector. Existing App Builder tool calls remain available through approved job flow.');

  async function loadServices() {
    setLoading(true);
    try {
      const response = await fetch('/api/dsg/agent-runtime/services', { cache: 'no-store' });
      const json = await response.json().catch(() => null) as ApiResult | null;
      if (response.ok && json?.ok && json.data?.services?.length) {
        setServices(json.data.services);
        setTruthBoundary(json.data.truthBoundary);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadServices();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter((service) => `${service.label} ${service.status} ${service.description} ${service.evidence.join(' ')} ${service.userBenefit}`.toLowerCase().includes(q));
  }, [query, services]);

  async function copyService(service: RuntimeService) {
    await navigator.clipboard.writeText(JSON.stringify(service, null, 2));
    setCopied(service.id);
    window.setTimeout(() => setCopied(null), 1400);
  }

  async function copyServiceMenu() {
    const text = services.map((service) => `${service.label}\n- id: ${service.id}\n- status: ${service.status}\n- action: ${service.action}\n- evidence: ${service.evidence.join(', ')}\n- boundary: ${service.truthBoundary}`).join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopied('all');
    window.setTimeout(() => setCopied(null), 1400);
  }

  function openLocalBrowser() {
    const target = browserUrl.trim() || '/product-ready';
    window.open(target, '_blank', 'noopener,noreferrer');
  }

  async function copyBrowserProofTask() {
    const target = browserUrl.trim() || '/product-ready';
    const task = {
      tool: 'browser.local.open_url',
      target,
      expectedProof: ['visible URL', 'manual screenshot', 'observed result'],
      truthBoundary: 'Manual browser inspection only. Remote browser automation is connector_required until wired.',
    };
    await navigator.clipboard.writeText(JSON.stringify(task, null, 2));
    setCopied('browser-task');
    window.setTimeout(() => setCopied(null), 1400);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">บริการเอเจนต์ / Runtime Console</h1>
          <p className="mt-1 text-slate-500">ดึง action-layer, tool calling และ browser contract ออกมาให้กดใช้แบบ Manus-style โดยไม่เคลม remote browser เกินหลักฐาน</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => goTo('chat')} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500">เริ่มใช้ Agent <ArrowRight className="h-4 w-4" /></button>
          <button onClick={() => void loadServices()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          <button onClick={() => void copyServiceMenu()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"><Clipboard className="h-4 w-4" /> {copied === 'all' ? 'คัดลอกแล้ว' : 'Copy services'}</button>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 text-sm leading-7 text-amber-100">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
          <Lock className="h-4 w-4" /> Action-layer boundary
        </div>
        <p className="mt-3">{truthBoundary}</p>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-200"><ExternalLink className="h-4 w-4 text-indigo-400" /> Local Browser Proof</div>
        <p className="mb-4 text-sm text-slate-500">กดเปิด route ใน browser เครื่องผู้ใช้เพื่อเก็บหลักฐานด้วยตา/สกรีนช็อตก่อน. นี่ไม่ใช่ remote browser automation.</p>
        <div className="flex flex-col gap-2 md:flex-row">
          <input value={browserUrl} onChange={(event) => setBrowserUrl(event.target.value)} placeholder="/product-ready หรือ https://..." className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/40" />
          <button onClick={openLocalBrowser} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500"><Play className="h-4 w-4" /> เปิดดู</button>
          <button onClick={() => void copyBrowserProofTask()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800"><Clipboard className="h-4 w-4" /> {copied === 'browser-task' ? 'คัดลอกแล้ว' : 'Copy task'}</button>
        </div>
      </section>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหา service เช่น browser, PR, runtime, Vercel..." className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-10 pr-4 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-500/40" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/50 text-slate-500">
            <tr>
              <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider">Service</th>
              <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider">Benefit / Evidence</th>
              <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-right">Endpoint / Secrets</th>
              <th className="px-6 py-4 text-center text-xs font-medium uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.map((service) => (
              <tr key={service.id} className="hover:bg-slate-800/20">
                <td className="px-6 py-4 font-medium text-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded border border-slate-700 bg-slate-800">
                      <Terminal className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div>
                      <p>{service.label}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-500">{service.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400">
                  <p>{service.userBenefit}</p>
                  <p className="mt-1 text-xs text-slate-500">proof: {service.evidence.join(', ')}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${statusClass(service.status)}`}>{service.status}</span>
                </td>
                <td className="px-6 py-4 text-right text-xs text-slate-500">
                  <p className="font-mono">{service.endpoint || service.implementation}</p>
                  <p>{service.requiredSecrets.length ? service.requiredSecrets.join(', ') : 'no secret'}</p>
                </td>
                <td className="px-6 py-4 text-center">
                  {service.id === 'browser.local.open_url' ? (
                    <button onClick={openLocalBrowser} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800">{serviceActionLabel(service)}</button>
                  ) : service.status === 'approval_required' ? (
                    <button onClick={() => goTo('chat')} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800">{serviceActionLabel(service)}</button>
                  ) : service.status === 'quota_gated' ? (
                    <button onClick={() => goTo('proof')} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800">{serviceActionLabel(service)}</button>
                  ) : (
                    <button onClick={() => void copyService(service)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800">{copied === service.id ? 'Copied' : serviceActionLabel(service)}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h3 className="mb-2 flex items-center gap-2 font-semibold text-slate-200">
          <Key className="h-4 w-4 text-slate-400" /> Runtime key / remote browser
        </h3>
        <p className="mb-4 text-sm text-slate-500">key ไม่โชว์ใน UI. Remote browser ต้องมี executor จริงก่อนจึงจะเปิด autonomous browsing ได้. ตอนนี้ผู้ใช้ยังได้ประโยชน์จาก local browser proof + PR evidence โดยไม่เปลือง Vercel quota.</p>
        <div className="flex gap-3">
          <div className="flex flex-1 items-center justify-between rounded border border-slate-800 bg-slate-950 px-4 py-2 font-mono text-sm text-slate-500">server-side only / connector required</div>
          <button onClick={() => goTo('executions')} className="flex items-center gap-2 rounded border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">ดูหลักฐาน</button>
        </div>
      </div>
    </div>
  );
}
