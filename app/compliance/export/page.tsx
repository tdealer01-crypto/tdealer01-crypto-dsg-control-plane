'use client';

import { useState } from 'react';

type ExportFormat = 'evidence.json' | 'audit-log.json' | 'replay-proof.json' | 'claim-boundary.json' | 'bundle';
type Framework = 'all' | 'EU AI Act' | 'ISO 42001';

const EXPORTS: { key: ExportFormat; label: string; description: string }[] = [
  { key: 'evidence.json', label: 'evidence.json', description: 'Compliance matrix with control statuses and evidence hashes' },
  { key: 'audit-log.json', label: 'audit-log.json', description: 'Structured audit log of all compliance controls' },
  { key: 'replay-proof.json', label: 'replay-proof.json', description: 'Replay proof envelope for CCVS chain verification' },
  { key: 'claim-boundary.json', label: 'claim-boundary.json', description: 'Allowed and blocked claim boundary definitions' },
  { key: 'bundle', label: 'Full bundle', description: 'All four files in a single JSON object' },
];

export default function ComplianceExportPage() {
  const [framework, setFramework] = useState<Framework>('all');
  const [downloading, setDownloading] = useState<string | null>(null);

  async function download(format: ExportFormat) {
    setDownloading(format);
    try {
      const params = new URLSearchParams({ format, framework });
      const res = await fetch(`/api/compliance/export?${params.toString()}`);
      const data = await res.json() as unknown;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'bundle' ? 'dsg-compliance-bundle.json' : format;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Compliance Pack</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Export compliance bundle</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          Download evidence, audit log, replay proof, and claim boundary files for your compliance review.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-sm text-amber-200">
        <strong>Boundary:</strong> Pre-audit evidence mapping only. <code>certificationClaim=false</code> ·{' '}
        <code>independentAuditClaim=false</code>. Not a legal certification or independent audit result.
      </div>

      <div className="mt-8">
        <p className="text-sm font-semibold text-slate-300">Filter by framework</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {(['all', 'EU AI Act', 'ISO 42001'] as Framework[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFramework(f)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                framework === f
                  ? 'bg-cyan-400 text-slate-950'
                  : 'border border-white/20 bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {EXPORTS.map((exp) => (
          <div key={exp.key} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
            <p className="font-mono text-sm font-semibold text-cyan-300">{exp.label}</p>
            <p className="mt-2 text-sm text-slate-400">{exp.description}</p>
            <button
              type="button"
              onClick={() => void download(exp.key)}
              disabled={downloading !== null}
              className="mt-4 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              {downloading === exp.key ? 'Downloading…' : `Download ${exp.label}`}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6">
        <h2 className="text-lg font-bold text-white">API reference</h2>
        <p className="mt-2 text-sm text-slate-400">Direct JSON endpoint:</p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-black/30 p-4 text-xs text-slate-300">
{`GET /api/compliance/export
  ?format=evidence.json|audit-log.json|replay-proof.json|claim-boundary.json|bundle
  &framework=all|EU+AI+Act|ISO+42001`}
        </pre>
        <p className="mt-3 text-sm text-slate-400">MCP tool:</p>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-black/30 p-4 text-xs text-slate-300">
{`POST /api/mcp  (JSON-RPC 2.0)
{
  "jsonrpc": "2.0", "id": 1,
  "method": "tools/call",
  "params": {
    "name": "dsg.exportComplianceBundle",
    "arguments": { "framework": "EU AI Act" }
  }
}`}
        </pre>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <a href="/compliance/evidence" className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white">
          View evidence chain
        </a>
        <a href="/compliance/eu-ai-act" className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white">
          EU AI Act mapping
        </a>
      </div>
    </main>
  );
}
