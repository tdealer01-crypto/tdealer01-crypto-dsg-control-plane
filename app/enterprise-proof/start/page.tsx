'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function EnterpriseProofStartPage() {
  const [bootstrap, setBootstrap] = useState<{ org_id: string; agent_id: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function runBootstrap() {
    setLoading(true);
    setError('');
    try {
      const token = process.env.NEXT_PUBLIC_DEMO_BOOTSTRAP_TOKEN || '';
      const res = await fetch('/api/demo/bootstrap', { method: 'POST', headers: { 'x-demo-token': token } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Bootstrap failed');
      setBootstrap({ org_id: json.org_id, agent_id: json.agent_id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bootstrap failed');
    } finally {
      setLoading(false);
    }
  }

  const reportHref = bootstrap
    ? `/enterprise-proof/report?org_id=${encodeURIComponent(bootstrap.org_id)}&agent_id=${encodeURIComponent(bootstrap.agent_id)}`
    : '/enterprise-proof/report';

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white" data-testid="enterprise-proof-start">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-3xl font-semibold">Enterprise Proof Walkthrough</h1>
        <ol className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-200" data-testid="walkthrough-steps">
          <li>1. Product value and landing positioning</li>
          <li>2. Secure workspace and org context</li>
          <li>3. Runtime intent and execute flow</li>
          <li>4. Runtime summary and ledger lineage</li>
          <li>5. Governance and RBAC visibility</li>
          <li>6. Checkpoint and recovery verification</li>
          <li>7. Billing and operational value</li>
        </ol>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="rounded-lg border border-slate-700 px-4 py-2">Open Landing</Link>
          <Link href="/dashboard" className="rounded-lg border border-slate-700 px-4 py-2">Open Secure Workspace</Link>
          <button onClick={runBootstrap} disabled={loading} className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-60">
            {loading ? 'Bootstrapping…' : 'Bootstrap Demo Runtime Evidence'}
          </button>
          <Link href={reportHref} className="rounded-lg border border-cyan-500 px-4 py-2 text-cyan-300" data-testid="open-executive-report">Open Executive Report</Link>
        </div>
        {bootstrap ? <p data-testid="demo-context" className="text-sm text-cyan-300">Demo context ready: {bootstrap.org_id} / {bootstrap.agent_id}</p> : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </div>
    </main>
  );
}
