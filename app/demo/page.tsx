'use client';

/* eslint-disable react/no-unescaped-entities */

import { useEffect, useMemo, useState } from 'react';

interface GateRequest {
  user_id: string;
  org_id: string;
  intent: string;
  context?: Record<string, any>;
}

interface GateResponse {
  ok: boolean;
  decision: 'allow' | 'review' | 'block';
  audit_id: string;
  proof_hash: string;
  constraint_hash: string;
  input_hash: string;
  message?: string;
  error?: string;
  detail?: string;
  request_id?: string;
  usage?: {
    used: number;
    limit: number;
    remaining: number;
  };
  quota_exceeded?: boolean;
  upgrade_url?: string;
}

type ApiStatus = 'checking' | 'available' | 'unavailable';

type Diagnostic = {
  endpoint: string;
  httpStatus?: number;
  requestId?: string;
};

export default function DemoPage() {
  const [request, setRequest] = useState<GateRequest>({
    user_id: 'user_accenture_demo',
    org_id: 'org_accenture_th',
    intent: 'Approve loan application LOAN-2026-0042 for customer CUST-8891',
    context: {
      amount: 500000,
      currency: 'THB',
      risk_level: 'medium',
      department: 'retail_banking',
    },
  });
  const [response, setResponse] = useState<GateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');
  const [origin, setOrigin] = useState('');
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const gateEndpoint = '/api/dsg/v1/gates/evaluate';
  const absoluteGateEndpoint = `${origin || ''}${gateEndpoint}`;

  const checkApi = async () => {
    setApiStatus('checking');
    try {
      const health = await fetch('/api/health', { cache: 'no-store' });
      if (!health.ok) {
        setApiStatus('unavailable');
        return;
      }
      setApiStatus('available');
    } catch {
      setApiStatus('unavailable');
    }
  };

  useEffect(() => {
    void checkApi();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    setDiagnostic(null);
    const start = performance.now();

    try {
      const res = await fetch(gateEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const latency = performance.now() - start;
      setLastLatency(latency);

      const text = await res.text();
      let data: GateResponse | null = null;

      if (text) {
        try {
          data = JSON.parse(text) as GateResponse;
        } catch {
          setDiagnostic({
            endpoint: absoluteGateEndpoint || gateEndpoint,
            httpStatus: res.status,
            requestId: res.headers.get('x-request-id') || undefined,
          });
          throw new Error(`API returned a non-JSON response (HTTP ${res.status})`);
        }
      }

      if (!res.ok) {
        setDiagnostic({
          endpoint: absoluteGateEndpoint || gateEndpoint,
          httpStatus: res.status,
          requestId: res.headers.get('x-request-id') || data?.request_id || undefined,
        });
        setError(data?.detail || data?.error || data?.message || `Gate evaluation failed (HTTP ${res.status})`);
        if (data) setResponse(data);
        return;
      }

      if (!data) {
        setDiagnostic({
          endpoint: absoluteGateEndpoint || gateEndpoint,
          httpStatus: res.status,
          requestId: res.headers.get('x-request-id') || undefined,
        });
        throw new Error('Demo API returned an empty response. Please retry.');
      }

      setResponse(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (preset: GateRequest) => {
    setRequest(preset);
  };

  const presets: { label: string; request: GateRequest }[] = [
    {
      label: '✅ Allow: Low-risk loan approval',
      request: {
        user_id: 'user_accenture_demo',
        org_id: 'org_accenture_th',
        intent: 'Approve loan application LOAN-2026-0042 for customer CUST-8891',
        context: { amount: 50000, currency: 'THB', risk_level: 'low', department: 'retail_banking' },
      },
    },
    {
      label: '⚠️ Review: High-value transaction',
      request: {
        user_id: 'user_accenture_demo',
        org_id: 'org_accenture_th',
        intent: 'Transfer 50,000,000 THB to external account EXT-9999',
        context: { amount: 50000000, currency: 'THB', risk_level: 'critical', department: 'treasury' },
      },
    },
    {
      label: '🚫 Block: Unauthorized access attempt',
      request: {
        user_id: 'user_unknown',
        org_id: 'org_accenture_th',
        intent: 'Delete production database backup',
        context: { resource: 'prod-db-backup', action: 'delete', department: 'it_ops' },
      },
    },
    {
      label: '💰 Cost check: AI model invocation',
      request: {
        user_id: 'user_accenture_demo',
        org_id: 'org_accenture_th',
        intent: 'Invoke GPT-4 for financial report generation',
        context: { model: 'gpt-4', estimated_tokens: 50000, department: 'analytics' },
      },
    },
  ];

  const curl = useMemo(() => {
    const endpoint = `${origin || 'https://dsg-control-plane.azurewebsites.net'}${gateEndpoint}`;
    return `curl -X POST ${endpoint} \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(request).replace(/'/g, "\\'")}'`;
  }, [origin, request]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard may be unavailable in some embedded browsers.
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-300 mb-3">Public Demo — Evaluation Only</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">DSG Gate API — Deterministic AI Governance</h1>
          <p className="text-lg text-slate-300 max-w-3xl mx-auto">
            This demo evaluates policy decisions only. It does not execute loans, payments, deployments, or other external actions.
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">Demo API</div>
            <div className={`font-semibold ${apiStatus === 'available' ? 'text-emerald-300' : apiStatus === 'unavailable' ? 'text-rose-300' : 'text-amber-300'}`}>
              {apiStatus === 'available' ? 'Available' : apiStatus === 'unavailable' ? 'Unavailable' : 'Checking…'}
            </div>
            <div className="text-xs text-slate-500 break-all">Endpoint: {absoluteGateEndpoint || gateEndpoint}</div>
          </div>
          <button onClick={() => void checkApi()} className="px-4 py-2 rounded-xl border border-white/10 text-sm text-slate-200 hover:bg-white/10">
            Retry connection
          </button>
        </div>

        <div className="mb-8">
          <p className="text-sm text-slate-400 mb-4">Quick Presets (Thai Banking Context)</p>
          <div className="flex flex-wrap gap-3">
            {presets.map((p, i) => (
              <button key={i} onClick={() => handlePreset(p.request)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 hover:border-white/20 transition">
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-lg font-bold text-white mb-4">Request</h2>
            <div className="space-y-4">
              <input type="text" value={request.user_id} onChange={(e) => setRequest({ ...request, user_id: e.target.value })} className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white" />
              <input type="text" value={request.org_id} onChange={(e) => setRequest({ ...request, org_id: e.target.value })} className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white" />
              <textarea value={request.intent} onChange={(e) => setRequest({ ...request, intent: e.target.value })} rows={3} className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white resize-none" />
              <textarea value={JSON.stringify(request.context, null, 2)} readOnly rows={6} className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white resize-none font-mono text-sm" />
              <button onClick={handleSubmit} disabled={loading || apiStatus !== 'available'} className="w-full py-3 rounded-xl bg-emerald-400 text-emerald-950 font-bold hover:bg-emerald-300 transition disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Evaluating…' : apiStatus === 'available' ? 'Evaluate Gate' : 'Demo API unavailable'}
              </button>

              <details className="mt-6 group cursor-pointer">
                <summary className="font-semibold text-slate-300">cURL Command</summary>
                <div className="mt-3 space-y-2">
                  <pre className="overflow-x-auto rounded-xl bg-black/40 p-4 text-xs text-emerald-300 font-mono whitespace-pre">{curl}</pre>
                  <button onClick={() => void copyText(curl)} className="text-xs text-slate-300 underline">Copy cURL</button>
                </div>
              </details>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              Response
              {lastLatency !== null && <span className="text-xs text-slate-500 ml-auto">{lastLatency.toFixed(1)}ms</span>}
            </h2>

            {loading && <div className="text-slate-300">Sending request → Policy evaluation → Awaiting decision…</div>}

            {error && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-200 space-y-2">
                <div className="font-semibold">Demo evaluation failed</div>
                <div>{error}</div>
                {diagnostic && (
                  <div className="text-xs text-rose-200/80 font-mono space-y-1">
                    <div>Endpoint: {diagnostic.endpoint}</div>
                    {diagnostic.httpStatus !== undefined && <div>HTTP: {diagnostic.httpStatus}</div>}
                    {diagnostic.requestId && <div>Request ID: {diagnostic.requestId}</div>}
                  </div>
                )}
                <button onClick={handleSubmit} className="text-xs underline">Retry evaluation</button>
              </div>
            )}

            {response && (
              <div className="space-y-4">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${response.decision === 'allow' ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30' : response.decision === 'review' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-rose-400/20 text-rose-300 border border-rose-400/30'}`}>
                  <span className="uppercase tracking-wider">{response.decision}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-black/40 p-3 border border-white/10"><div className="text-xs text-slate-500">Audit ID</div><div className="font-mono text-sm text-emerald-300 break-all">{response.audit_id}</div></div>
                  <div className="rounded-xl bg-black/40 p-3 border border-white/10"><div className="text-xs text-slate-500">Decision</div><div className="font-mono text-sm text-white capitalize">{response.decision}</div></div>
                </div>
                <div className="rounded-xl bg-black/40 p-3 border border-white/10">
                  <div className="text-xs text-slate-500 mb-2">Cryptographic Proof Chain</div>
                  <div className="space-y-1 text-xs font-mono">
                    <div>Input: {response.input_hash}</div>
                    <div>Constraint: {response.constraint_hash}</div>
                    <div>Proof: {response.proof_hash}</div>
                  </div>
                </div>
                <button onClick={() => void copyText(JSON.stringify(response, null, 2))} className="text-xs text-slate-300 underline">Copy JSON</button>
              </div>
            )}

            {!response && !loading && !error && <div className="text-center py-12 text-slate-500">Choose a preset and evaluate the gate.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
