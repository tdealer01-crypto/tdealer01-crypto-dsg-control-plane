"use client";

import { useState } from "react";

interface GateRequest {
  user_id: string;
  org_id: string;
  intent: string;
  context?: Record<string, any>;
}

interface GateResponse {
  ok: boolean;
  decision: "allow" | "review" | "block";
  audit_id: string;
  proof_hash: string;
  constraint_hash: string;
  input_hash: string;
  message?: string;
  usage?: {
    used: number;
    limit: number;
    remaining: number;
  };
  quota_exceeded?: boolean;
  upgrade_url?: string;
}

export default function DemoPage() {
  const [request, setRequest] = useState<GateRequest>({
    user_id: "user_accenture_demo",
    org_id: "org_accenture_th",
    intent: "Approve loan application LOAN-2026-0042 for customer CUST-8891",
    context: {
      amount: 500000,
      currency: "THB",
      risk_level: "medium",
      department: "retail_banking",
    },
  });
  const [response, setResponse] = useState<GateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLatency, setLastLatency] = useState<number | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    const start = performance.now();

    try {
      const res = await fetch("/api/dsg/v1/gates/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const latency = performance.now() - start;
      setLastLatency(latency);

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        setResponse(data);
      } else {
        setResponse(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (preset: GateRequest) => {
    setRequest(preset);
  };

  const presets: { label: string; request: GateRequest }[] = [
    {
      label: "✅ Allow: Low-risk loan approval",
      request: {
        user_id: "user_accenture_demo",
        org_id: "org_accenture_th",
        intent: "Approve loan application LOAN-2026-0042 for customer CUST-8891",
        context: { amount: 50000, currency: "THB", risk_level: "low", department: "retail_banking" },
      },
    },
    {
      label: "⚠️ Review: High-value transaction",
      request: {
        user_id: "user_accenture_demo",
        org_id: "org_accenture_th",
        intent: "Transfer 50,000,000 THB to external account EXT-9999",
        context: { amount: 50000000, currency: "THB", risk_level: "critical", department: "treasury" },
      },
    },
    {
      label: "🚫 Block: Unauthorized access attempt",
      request: {
        user_id: "user_unknown",
        org_id: "org_accenture_th",
        intent: "Delete production database backup",
        context: { resource: "prod-db-backup", action: "delete", department: "it_ops" },
      },
    },
    {
      label: "💰 Cost check: AI model invocation",
      request: {
        user_id: "user_accenture_demo",
        org_id: "org_accenture_th",
        intent: "Invoke GPT-4 for financial report generation",
        context: { model: "gpt-4", estimated_tokens: 50000, department: "analytics" },
      },
    },
  ];

  const curl = `curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/dsg/v1/gates/evaluate \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(request).replace(/'/g, "\\'")}'`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-300 mb-3">Live Demo</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            DSG Gate API — Deterministic AI Governance
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Same input → Same decision, always. Cryptographic proof per evaluation.
            Try the live API below — it&apos;s running on production.
          </p>
        </div>

        {/* Preset Buttons */}
        <div className="mb-8">
          <p className="text-sm text-slate-400 mb-4">Quick Presets (Thai Banking Context)</p>
          <div className="flex flex-wrap gap-3">
            {presets.map((p, i) => (
              <button
                key={i}
                onClick={() => handlePreset(p.request)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 hover:border-white/20 transition"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Request Panel */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-emerald-400">▶</span>
              Request
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">User ID</label>
                <input
                  type="text"
                  value={request.user_id}
                  onChange={(e) => setRequest({ ...request, user_id: e.target.value })}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Org ID</label>
                <input
                  type="text"
                  value={request.org_id}
                  onChange={(e) => setRequest({ ...request, org_id: e.target.value })}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Intent (Action)</label>
                <textarea
                  value={request.intent}
                  onChange={(e) => setRequest({ ...request, intent: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Context (JSON)</label>
                <textarea
                  value={JSON.stringify(request.context, null, 2)}
                  onChange={(e) => {
                    try {
                      setRequest({ ...request, context: JSON.parse(e.target.value) });
                    } catch { /* ignore invalid JSON */ }
                  }}
                  rows={6}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none resize-none font-mono text-sm"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-400 text-emerald-950 font-bold hover:bg-emerald-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Evaluating..." : "Evaluate Gate"}
              </button>

              {/* cURL Example */}
              <details className="mt-6 group cursor-pointer">
                <summary className="flex items-center justify-between font-semibold text-slate-300 hover:text-white">
                  <span>cURL Command</span>
                  <span className="transition group-open:rotate-180">▼</span>
                </summary>
                <pre className="mt-3 overflow-x-auto rounded-xl bg-black/40 p-4 text-xs text-emerald-300 font-mono whitespace-pre">
{curl}
</pre>
              </details>
            </div>
          </div>

          {/* Response Panel */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-emerald-400">■</span>
              Response
              {lastLatency && (
                <span className="text-xs text-slate-500 ml-auto">{lastLatency.toFixed(1)}ms</span>
              )}
            </h2>

            {error && !response && (
              <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-rose-300">
                Error: {error}
              </div>
            )}

            {response && (
              <div className="space-y-4">
                {/* Decision Badge */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${
                  response.decision === "allow"
                    ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                    : response.decision === "review"
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                    : "bg-rose-400/20 text-rose-300 border border-rose-400/30"
                }`}>
                  <span className="text-lg">{response.decision === "allow" ? "✅" : response.decision === "review" ? "⚠️" : "🚫"}</span>
                  <span className="uppercase tracking-wider">{response.decision}</span>
                </div>

                {/* Audit Info */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-black/40 p-3 border border-white/10">
                    <div className="text-xs text-slate-500">Audit ID</div>
                    <div className="font-mono text-sm text-emerald-300 break-all">{response.audit_id}</div>
                  </div>
                  <div className="rounded-xl bg-black/40 p-3 border border-white/10">
                    <div className="text-xs text-slate-500">Decision</div>
                    <div className="font-mono text-sm text-white capitalize">{response.decision}</div>
                  </div>
                </div>

                {/* Proof Hashes */}
                <div className="rounded-xl bg-black/40 p-3 border border-white/10">
                  <div className="text-xs text-slate-500 mb-2">Cryptographic Proof Chain</div>
                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex gap-2"><span className="text-slate-500 w-24">Input:</span><span className="text-emerald-300">{response.input_hash?.slice(0, 32)}...</span></div>
                    <div className="flex gap-2"><span className="text-slate-500 w-24">Constraint:</span><span className="text-violet-300">{response.constraint_hash?.slice(0, 32)}...</span></div>
                    <div className="flex gap-2"><span className="text-slate-500 w-24">Proof:</span><span className="text-amber-300">{response.proof_hash?.slice(0, 32)}...</span></div>
                  </div>
                </div>

                {/* Usage / Quota */}
                {response.usage && (
                  <div className="rounded-xl bg-black/40 p-3 border border-white/10">
                    <div className="text-xs text-slate-500 mb-2">Quota Usage</div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-white">Used: <span className="text-emerald-300">{response.usage.used}</span></span>
                      <span className="text-slate-400">Limit: <span className="text-white">{response.usage.limit}</span></span>
                      <span className="text-emerald-400">Remaining: {response.usage.remaining}</span>
                    </div>
                    <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 transition-all" style={{ width: `${(response.usage.used / response.usage.limit) * 100}%` }} />
                    </div>
                  </div>
                )}

                {/* Quota Exceeded */}
                {response.quota_exceeded && (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-300">
                    <p>Quota exceeded. <a href={response.upgrade_url} className="underline hover:text-amber-200">Upgrade to continue</a></p>
                  </div>
                )}

                {/* Raw JSON */}
                <details className="group cursor-pointer mt-2">
                  <summary className="flex items-center justify-between font-semibold text-slate-300 hover:text-white">
                    <span>Raw JSON Response</span>
                    <span className="transition group-open:rotate-180">▼</span>
                  </summary>
                  <pre className="mt-3 overflow-x-auto rounded-xl bg-black/40 p-4 text-xs text-slate-300 font-mono whitespace-pre">
{JSON.stringify(response, null, 2)}
</pre>
                </details>
              </div>
            )}

            {!response && !loading && !error && (
              <div className="text-center py-12 text-slate-500">
                <div className="text-4xl mb-3">🛡️</div>
                <p>Click "Evaluate Gate" to see the deterministic decision</p>
                <p className="text-xs mt-2">Every evaluation returns: decision + audit_id + proof hashes</p>
              </div>
            )}
          </div>
        </div>

        {/* Architecture Note */}
        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="text-lg font-bold text-white mb-3">How It Works (Production Architecture)</h3>
          <div className="grid gap-4 md:grid-cols-4 text-sm">
            <div className="rounded-xl bg-black/40 p-4 border border-white/10">
              <div className="text-emerald-400 mb-1">1. Input Hash</div>
              <div className="text-slate-400">SHA-256(request) — immutable fingerprint</div>
            </div>
            <div className="rounded-xl bg-black/40 p-4 border border-white/10">
              <div className="text-violet-400 mb-1">2. Policy Evaluation</div>
              <div className="text-slate-400">Z3 SMT solver checks 8 theorems</div>
            </div>
            <div className="rounded-xl bg-black/40 p-4 border border-white/10">
              <div className="text-amber-400 mb-1">3. Proof Generation</div>
              <div className="text-slate-400">Formal verification → proof_hash</div>
            </div>
            <div className="rounded-xl bg-black/40 p-4 border border-white/10">
              <div className="text-cyan-400 mb-1">4. Audit Chain</div>
              <div className="text-slate-400">recordHash → bundleHash (WORM)</div>
            </div>
          </div>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.__DEMO_REQUEST__ = ${JSON.stringify(request, null, 2)};
            window.__DEMO_CURL__ = \`curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/dsg/v1/gates/evaluate \\\\
  -H "Content-Type: application/json" \\\\
  -d '${JSON.stringify(request).replace(/'/g, "\\'")}'\`;
          `,
        }}
      />
    </div>
  );
}